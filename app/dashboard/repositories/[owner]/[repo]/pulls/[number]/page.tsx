import Link from "next/link";
import prisma from "@/lib/db";
import {
  getGithubToken,
  getPullRequest,
  getPullRequestFiles,
} from "@/lib/github";
import { getFindings } from "@/lib/review";
import { fileIcon, severityIcon } from "@/lib/ui";
import { requireAuth } from "@/modules/auth/utils/auth-utils";
import {
  PostReviewButton,
  RunReviewButton,
} from "@/modules/reviews/components/review-actions";

interface PageProps {
  params: Promise<{ owner: string; repo: string; number: string }>;
}

export default async function PullRequestPage({ params }: PageProps) {
  const { owner, repo, number: numberParam } = await params;
  const number = Number(numberParam);
  const session = await requireAuth();
  const token = await getGithubToken(session.user.id);

  if (!token) {
    return (
      <div className="mx-auto max-w-[1204px] p-6">
        <p className="text-[14px] text-muted-foreground">
          No GitHub account connected.
        </p>
        <Link
          href="/dashboard/settings"
          className="mt-3 inline-block text-[14px] underline underline-offset-4"
        >
          Connect GitHub
        </Link>
      </div>
    );
  }

  const repoFullName = `${owner}/${repo}`;
  const pr = await getPullRequest(token, owner, repo, number);
  const files = await getPullRequestFiles(token, owner, repo, number);

  const review = await prisma.review.findFirst({
    where: {
      userId: session.user.id,
      repoFullName,
      prNumber: number,
    },
    orderBy: { createdAt: "desc" },
  });

  const findings = review ? getFindings(review) : [];
  const skippedFiles = review
    ? ((review.skippedFiles as string[] | null) ?? [])
    : [];
  const isStale = Boolean(review && review.headSha !== pr.head.sha);
  const hasFindings = findings.length > 0;

  return (
    <div className="mx-auto max-w-[1204px] p-6">
      <nav className="text-[13px] text-muted-foreground">
        <Link href="/dashboard/repositories" className="hover:text-foreground">
          Repositories
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/dashboard/repositories/${owner}/${repo}`}
          className="hover:text-foreground"
        >
          {repoFullName}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">#{number}</span>
      </nav>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight">
            {pr.title}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
            <span className="pill pill-brand">{pr.state}</span>
            <span>{pr.user.login}</span>
            <span className="tnum">
              +{pr.additions ?? 0} −{pr.deletions ?? 0}
            </span>
            <span>{pr.changed_files ?? files.length} files</span>
            <span className="font-mono text-[12px]">{pr.head.sha.slice(0, 7)}</span>
            <a
              href={pr.html_url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Open on GitHub
            </a>
          </p>
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <RunReviewButton
            owner={owner}
            repo={repo}
            number={number}
            force={Boolean(review) && !isStale}
            label={review && !isStale ? "Re-review" : "Run review"}
          />
          {review && !review.postedAt && (
            <PostReviewButton
              owner={owner}
              repo={repo}
              number={number}
              reviewId={review.id}
            />
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="text-[16px] font-medium">Code Sentinel review</h2>
            {review ? (
              <p className="text-[12px] text-muted-foreground">
                {new Date(review.createdAt).toLocaleString()} · {review.model} ·{" "}
                {review.status}
                {isStale && " · stale, new commits since this run"}
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                Not reviewed yet
              </p>
            )}
          </header>

          <div className="space-y-4 px-4 py-4">
            {review?.status === "failed" && (
              <p className="rounded-md bg-severity-critical-bg px-3 py-2 text-[13px] text-severity-critical">
                {review.error}
              </p>
            )}
            {review?.status === "unparsed" && (
              <p className="text-[13px] text-muted-foreground">
                The model output could not be parsed as findings. Raw output
                below.
              </p>
            )}

            {review?.summary && (
              <p className="text-[14px] leading-relaxed">{review.summary}</p>
            )}

            {hasFindings && (
              <ul className="divide-y divide-border">
                {findings.map((finding, index) => {
                  const SeverityIcon = severityIcon(finding.severity);
                  return (
                    <li key={index} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`pill pill-${finding.severity}`}>
                          <SeverityIcon className="h-3.5 w-3.5" />
                          {finding.severity}
                        </span>
                        <span className="text-[14px] font-medium">
                          {finding.title}
                        </span>
                        {finding.file && (
                          <span className="font-mono text-[12px] text-muted-foreground">
                            {finding.line
                              ? `${finding.file}:${finding.line}`
                              : finding.file}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed">
                        {finding.description}
                      </p>
                      {finding.suggestedFix && (
                        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Suggested fix:{" "}
                          </span>
                          {finding.suggestedFix}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {review && !hasFindings && review.status === "completed" && (
              <p className="text-[13px] text-muted-foreground">
                No issues found in this diff.
              </p>
            )}

            {!review && (
              <p className="text-[13px] text-muted-foreground">
                Run a review to have Sentinel read this diff and report the
                defects it finds.
              </p>
            )}

            {skippedFiles.length > 0 && (
              <div className="rounded-md bg-muted px-3 py-2 text-[13px] text-muted-foreground">
                <p className="font-medium text-foreground">
                  Files not covered by the model
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {skippedFiles.map((file) => (
                    <li key={file}>{file}</li>
                  ))}
                </ul>
              </div>
            )}

            {review?.postedAt && (
              <p className="text-[12px] text-muted-foreground">
                Posted to GitHub {new Date(review.postedAt).toLocaleString()}.
              </p>
            )}
          </div>
        </section>

        <aside className="rounded-lg border">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-[16px] font-medium">Changed files</h2>
            <span className="text-[13px] text-muted-foreground">
              {files.length}
            </span>
          </header>
          <ul className="divide-y divide-border">
            {files.map((file) => {
              const FileIcon = fileIcon(file.filename);
              return (
                <li key={file.filename} className="flex items-center gap-2 px-4 py-2.5">
                  <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="min-w-0 flex-1 truncate font-mono text-[12px]">
                    {file.filename}
                  </p>
                  <span className="tnum shrink-0 text-[12px] text-muted-foreground">
                    <span className="text-emerald-700 dark:text-emerald-500">
                      +{file.additions}
                    </span>{" "}
                    <span className="text-red-700 dark:text-red-500">
                      −{file.deletions}
                    </span>
                  </span>
                </li>
              );
            })}
            {files.length === 0 && (
              <li className="px-4 py-6 text-[13px] text-muted-foreground">
                No changed files reported by GitHub.
              </li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
