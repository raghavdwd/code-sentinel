import Link from "next/link";
import { CircleCheck, CircleDot, CircleX, Siren } from "lucide-react";
import prisma from "@/lib/db";
import { getGithubToken, getOpenPullRequestsAcrossRepos } from "@/lib/github";
import { getFindings } from "@/lib/review";
import { languageColor } from "@/lib/ui";
import { requireAuth } from "@/modules/auth/utils/auth-utils";
import { ReviewNowButton } from "@/modules/reviews/components/review-actions";

const dayStart = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

const severityBar: Record<string, string> = {
  critical: "bg-severity-critical/70",
  high: "bg-severity-high/70",
  medium: "bg-severity-medium/70",
  low: "bg-severity-low/70",
};

export default async function OverviewPage() {
  const session = await requireAuth();
  const token = await getGithubToken(session.user.id);

  const [openPullRequests, reviews] = await Promise.all([
    token ? getOpenPullRequestsAcrossRepos(token) : Promise.resolve([]),
    prisma.review.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  if (!token) {
    return (
      <div className="mx-auto max-w-[1204px] p-6">
        <h1 className="text-[22px] font-semibold">Overview</h1>
        <div className="mt-6 rounded-lg border p-6">
          <p className="text-[14px]">
            Connect GitHub and Sentinel will list your open pull requests here.
          </p>
          <Link
            href="/dashboard/settings"
            className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-[14px] font-medium text-primary-foreground"
          >
            Connect GitHub
          </Link>
        </div>
      </div>
    );
  }

  const latestByPr = new Map<string, (typeof reviews)[number]>();
  for (const review of reviews) {
    const key = `${review.repoFullName}#${review.prNumber}`;
    if (!latestByPr.has(key)) latestByPr.set(key, review);
  }

  const queue = openPullRequests
    .map((pr) => {
      const review = latestByPr.get(`${pr.fullName}#${pr.number}`);
      const state = !review
        ? "pending"
        : review.status === "completed" && review.headSha === pr.head.sha
          ? "reviewed"
          : review.status === "failed"
            ? "failed"
            : "stale";
      return { pr, review, state };
    })
    .sort((a, b) => b.pr.updated_at.localeCompare(a.pr.updated_at));

  const awaiting = queue.filter(
    (row) => row.state === "pending" || row.state === "stale" || row.state === "failed"
  ).length;

  const lastRun = reviews[0];
  const lastRunFindings = lastRun ? getFindings(lastRun) : [];
  const critical = lastRunFindings.filter((f) => f.severity === "critical").length;
  const reviewedToday = reviews.filter(
    (review) => review.createdAt >= dayStart()
  ).length;

  const repos = new Set(openPullRequests.map((pr) => pr.fullName)).size;
  const kpis = [
    { label: "Open pull requests", value: openPullRequests.length },
    { label: "Awaiting review", value: awaiting, alert: awaiting > 0 },
    { label: "Findings, last run", value: lastRunFindings.length },
    { label: "Critical, last run", value: critical, alert: critical > 0 },
  ];

  return (
    <div className="mx-auto max-w-[1204px] p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {openPullRequests.length} open pull requests across {repos}{" "}
            {repos === 1 ? "repository" : "repositories"} · {reviewedToday}{" "}
            {reviewedToday === 1 ? "review" : "reviews"} today
          </p>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border md:grid-cols-4 md:divide-y-0">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="px-4 py-3">
            <p className="text-[13px] text-muted-foreground">{kpi.label}</p>
            <p
              className={`tnum mt-1 text-[28px] leading-8 ${
                kpi.alert ? "text-severity-medium" : ""
              }`}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border">
          <header className="flex items-center justify-between px-4 py-3">
            <h2 className="text-[16px] font-medium">Pull requests to review</h2>
            <Link
              href="/dashboard/repositories"
              className="text-[13px] text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          </header>

          <ul className="divide-y divide-border border-t border-border">
            {queue.slice(0, 8).map(({ pr, state }) => (
              <li
                key={`${pr.fullName}#${pr.number}`}
                className="flex items-center gap-4 px-4 py-3"
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
                    href={`/dashboard/repositories/${pr.owner}/${pr.repo}/pulls/${pr.number}`}
                    className="block truncate text-[14px] font-medium hover:underline"
                  >
                    {pr.title}
                  </Link>
                  <p className="flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: languageColor(pr.language) }}
                    />
                    {pr.fullName} · #{pr.number} · {pr.user.login} · updated{" "}
                    {new Date(pr.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <ReviewNowButton
                  owner={pr.owner}
                  repo={pr.repo}
                  number={pr.number}
                />
              </li>
            ))}
            {queue.length === 0 && (
              <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                No open pull requests in your recent repositories.
              </li>
            )}
          </ul>
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border">
            <header className="border-b border-border px-4 py-3">
              <h2 className="text-[16px] font-medium">Last run</h2>
            </header>
            {lastRun ? (
              <div className="space-y-3 px-4 py-3">
                <Link
                  href={`/dashboard/repositories/${lastRun.repoFullName}/pulls/${lastRun.prNumber}`}
                  className="block truncate text-[14px] font-medium hover:underline"
                >
                  {lastRun.prTitle}
                </Link>
                <p className="text-[12px] text-muted-foreground">
                  {lastRun.repoFullName} · #{lastRun.prNumber} ·{" "}
                  {new Date(lastRun.createdAt).toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {lastRunFindings.length === 0 && (
                    <span className="pill pill-neutral">No findings</span>
                  )}
                  {(["critical", "high", "medium", "low"] as const).map(
                    (severity) => {
                      const count = lastRunFindings.filter(
                        (f) => f.severity === severity
                      ).length;
                      if (count === 0) return null;
                      return (
                        <span key={severity} className={`pill pill-${severity}`}>
                          {count} {severity}
                        </span>
                      );
                    }
                  )}
                </div>
                {lastRunFindings.length > 0 && (
                  <div className="flex h-1 overflow-hidden rounded-full bg-muted">
                    {(["critical", "high", "medium", "low"] as const).map(
                      (severity) => {
                        const count = lastRunFindings.filter(
                          (f) => f.severity === severity
                        ).length;
                        if (count === 0) return null;
                        return (
                          <span
                            key={severity}
                            className={severityBar[severity]}
                            style={{
                              width: `${(count / lastRunFindings.length) * 100}%`,
                            }}
                          />
                        );
                      }
                    )}
                  </div>
                )}
                {lastRun.summary && (
                  <p className="line-clamp-4 text-[13px] text-muted-foreground">
                    {lastRun.summary}
                  </p>
                )}
              </div>
            ) : (
              <p className="px-4 py-6 text-[13px] text-muted-foreground">
                Sentinel has not reviewed anything yet.
              </p>
            )}
          </section>
        </aside>
      </div>

      <section className="mt-6 overflow-hidden rounded-lg border">
        <header className="flex items-center justify-between px-4 py-3">
          <h2 className="text-[16px] font-medium">Recent reviews</h2>
          <Link
            href="/dashboard/reviews"
            className="text-[13px] text-muted-foreground hover:text-foreground"
          >
            View all
          </Link>
        </header>
        <ul className="divide-y divide-border border-t border-border">
          {reviews.slice(0, 8).map((review) => {
            const count = getFindings(review).length;
            return (
              <li key={review.id} className="px-4 py-2.5">
                <Link
                  href={`/dashboard/repositories/${review.repoFullName}/pulls/${review.prNumber}`}
                  className="block truncate text-[13px] font-medium hover:underline"
                >
                  {review.prTitle}
                </Link>
                <p className="truncate text-[12px] text-muted-foreground">
                  {review.repoFullName} · #{review.prNumber} · {count}{" "}
                  {count === 1 ? "finding" : "findings"} ·{" "}
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </li>
            );
          })}
          {reviews.length === 0 && (
            <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">
              Sentinel has not reviewed anything yet.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
