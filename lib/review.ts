import prisma from "@/lib/db";
import { buildDiff } from "@/lib/diff";
import {
  getPullRequest,
  getPullRequestFiles,
  type GithubPullRequest,
  type GithubPullRequestFile,
} from "@/lib/github";
import { callReviewModel, parseReview, REVIEW_MODEL, type Finding } from "@/lib/llm";

const buildPrompt = (
  pr: GithubPullRequest,
  files: GithubPullRequestFile[],
  diff: string
) => `Pull request #${pr.number}: ${pr.title}
Author: ${pr.user.login}
Description:
${pr.body?.slice(0, 2000) || "(none)"}

Changed files:
${files.map((f) => `- ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})`).join("\n")}

Unified diff:
${diff || "(no patch available)"}`;

export const upsertRepository = async (
  userId: string,
  repo: {
    owner: string;
    name: string;
    htmlUrl: string;
    description?: string | null;
    language?: string | null;
    stars: number;
    private: boolean;
  }
) => {
  const fullName = `${repo.owner}/${repo.name}`;

  return prisma.repository.upsert({
    where: { userId_fullName: { userId, fullName } },
    create: {
      userId,
      owner: repo.owner,
      name: repo.name,
      fullName,
      htmlUrl: repo.htmlUrl,
      description: repo.description ?? null,
      language: repo.language ?? null,
      stars: repo.stars,
      private: repo.private,
    },
    update: {
      htmlUrl: repo.htmlUrl,
      description: repo.description ?? null,
      language: repo.language ?? null,
      stars: repo.stars,
      private: repo.private,
    },
  });
};

export const upsertPullRequest = async (
  userId: string,
  repositoryId: number,
  pr: GithubPullRequest
) => {
  return prisma.pullRequest.upsert({
    where: { repositoryId_number: { repositoryId, number: pr.number } },
    create: {
      userId,
      repositoryId,
      number: pr.number,
      title: pr.title,
      body: pr.body ?? null,
      state: pr.state,
      author: pr.user.login,
      headSha: pr.head.sha,
      htmlUrl: pr.html_url,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
    },
    update: {
      title: pr.title,
      body: pr.body ?? null,
      state: pr.state,
      headSha: pr.head.sha,
      htmlUrl: pr.html_url,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
    },
  });
};

export const getFindings = (review: { findings: unknown }): Finding[] => {
  return Array.isArray(review.findings) ? (review.findings as Finding[]) : [];
};

export const buildReviewComment = (review: {
  summary: string | null;
  findings: unknown;
}) => {
  const findings = getFindings(review);
  const lines = ["**Code Sentinel review**", "", review.summary || "", ""];

  if (findings.length === 0) {
    lines.push("No issues found.");
    return lines.join("\n");
  }

  for (const finding of findings) {
    const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
    lines.push(
      `- **${finding.severity.toUpperCase()}** ${location} — ${finding.title}`
    );
    lines.push(`  ${finding.description}`);
    if (finding.suggestedFix) lines.push(`  Suggested fix: ${finding.suggestedFix}`);
  }

  return lines.join("\n");
};

export const runReview = async ({
  userId,
  token,
  owner,
  repo,
  number,
  force = false,
}: {
  userId: string;
  token: string;
  owner: string;
  repo: string;
  number: number;
  force?: boolean;
}) => {
  const repoFullName = `${owner}/${repo}`;
  const pr = await getPullRequest(token, owner, repo, number);

  if (!force) {
    const existing = await prisma.review.findFirst({
      where: {
        userId,
        repoFullName,
        prNumber: number,
        headSha: pr.head.sha,
        status: { in: ["completed", "unparsed"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return existing;
  }

  const files = await getPullRequestFiles(token, owner, repo, number);
  const { diff, skipped } = buildDiff(files);

  const created = await prisma.review.create({
    data: {
      userId,
      repoFullName,
      prNumber: number,
      prTitle: pr.title,
      headSha: pr.head.sha,
      status: "pending",
      model: REVIEW_MODEL,
      findings: [],
      skippedFiles: skipped,
    },
  });

  try {
    const raw = await callReviewModel(buildPrompt(pr, files, diff));
    const parsed = parseReview(raw);

    return prisma.review.update({
      where: { id: created.id },
      data: parsed
        ? {
            status: "completed",
            summary: parsed.summary,
            findings: parsed.findings,
            skippedFiles: skipped,
          }
        : {
            status: "unparsed",
            summary: raw.slice(0, 4000),
            findings: [],
            skippedFiles: skipped,
          },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.review.update({
      where: { id: created.id },
      data: { status: "failed", error: message, skippedFiles: skipped },
    });
    throw error;
  }
};
