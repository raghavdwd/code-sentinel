import Link from "next/link";
import {
  CircleCheck,
  CircleDot,
  CircleX,
  GitPullRequest,
  Siren,
} from "lucide-react";
import prisma from "@/lib/db";
import {
  getGithubToken,
  getRepoPullRequests,
  getRepository,
} from "@/lib/github";
import { upsertPullRequest, upsertRepository } from "@/lib/review";
import { requireAuth } from "@/modules/auth/utils/auth-utils";
import { ReviewNowButton } from "@/modules/reviews/components/review-actions";

interface PageProps {
  params: Promise<{ owner: string; repo: string }>;
}

export default async function RepositoryPage({ params }: PageProps) {
  const { owner, repo } = await params;
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
  const repoInfo = await getRepository(token, owner, repo);
  const pullRequests = await getRepoPullRequests(token, owner, repo, "open");

  const repository = await upsertRepository(session.user.id, repoInfo);
  for (const pr of pullRequests) {
    await upsertPullRequest(session.user.id, repository.id, pr);
  }

  const reviews = await prisma.review.findMany({
    where: { userId: session.user.id, repoFullName },
    orderBy: { createdAt: "desc" },
  });
  const latestByPr = new Map<number, (typeof reviews)[number]>();
  for (const review of reviews) {
    if (!latestByPr.has(review.prNumber)) {
      latestByPr.set(review.prNumber, review);
    }
  }

  return (
    <div className="mx-auto max-w-[1204px] p-6">
      <nav className="text-[13px] text-muted-foreground">
        <Link href="/dashboard/repositories" className="hover:text-foreground">
          Repositories
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{repoFullName}</span>
      </nav>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            {repoFullName}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {repoInfo.description || "No description"} ·{" "}
            {repoInfo.language || "no language"} ·{" "}
            {repoInfo.stars.toLocaleString()} stars
          </p>
        </div>
        <a
          href={repoInfo.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Open on GitHub
        </a>
      </div>

      <section className="mt-6 overflow-hidden rounded-lg border">
        <header className="flex items-center justify-between px-4 py-3">
          <h2 className="text-[16px] font-medium">Open pull requests</h2>
          <span className="text-[13px] text-muted-foreground">
            {pullRequests.length} open
          </span>
        </header>

        <ul className="divide-y divide-border border-t border-border">
          {pullRequests.map((pr) => {
            const review = latestByPr.get(pr.number);
            const state = !review
              ? "pending"
              : review.status === "completed" && review.headSha === pr.head.sha
                ? "reviewed"
                : review.status === "failed"
                  ? "failed"
                  : "stale";

            return (
              <li
                key={pr.number}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
              >
                <span className="shrink-0">
                  {state === "reviewed" && (
                    <CircleCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                  )}
                  {state === "stale" && (
                    <Siren className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  )}
                  {state === "failed" && (
                    <CircleX className="h-4 w-4 text-red-600 dark:text-red-500" />
                  )}
                  {state === "pending" && (
                    <CircleDot className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/repositories/${owner}/${repo}/pulls/${pr.number}`}
                    className="flex items-center gap-1.5 truncate text-[14px] font-medium hover:underline"
                  >
                    <GitPullRequest className="h-4 w-4 shrink-0 text-brand" />
                    <span className="truncate">{pr.title}</span>
                  </Link>
                  <p className="truncate text-[12px] text-muted-foreground">
                    #{pr.number} · {pr.user.login}
                  </p>
                </div>
                <span className="tnum shrink-0 text-[12px] text-muted-foreground">
                  updated {new Date(pr.updated_at).toLocaleDateString()}
                </span>
                <ReviewNowButton owner={owner} repo={repo} number={pr.number} />
              </li>
            );
          })}
          {pullRequests.length === 0 && (
            <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">
              No open pull requests.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
