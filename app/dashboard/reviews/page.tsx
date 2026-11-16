import Link from "next/link";
import { CircleCheck, CircleX, Clock, Siren } from "lucide-react";
import prisma from "@/lib/db";
import { getFindings } from "@/lib/review";
import { severityIcon } from "@/lib/ui";
import { requireAuth } from "@/modules/auth/utils/auth-utils";

export default async function ReviewsPage() {
  const session = await requireAuth();
  const reviews = await prisma.review.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-[1204px] p-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Reviews</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {reviews.length} {reviews.length === 1 ? "review" : "reviews"} Sentinel
          has run for your repositories.
        </p>
      </div>

      <section className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden grid-cols-[minmax(0,1fr)_160px_140px_110px] items-center gap-4 px-4 py-2 text-[12px] text-muted-foreground md:grid">
          <span>Pull request</span>
          <span>Findings</span>
          <span>Status</span>
          <span className="text-right">Run</span>
        </div>
        <ul className="divide-y divide-border border-t border-border">
          {reviews.map((review) => {
            const findings = getFindings(review);
            const counts = findings.reduce<Record<string, number>>(
              (acc, finding) => {
                acc[finding.severity] = (acc[finding.severity] || 0) + 1;
                return acc;
              },
              {}
            );

            return (
              <li
                key={review.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:grid md:grid-cols-[minmax(0,1fr)_160px_140px_110px] md:items-center md:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/repositories/${review.repoFullName}/pulls/${review.prNumber}`}
                    className="block truncate text-[14px] font-medium hover:underline"
                  >
                    {review.prTitle}
                  </Link>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {review.repoFullName} · #{review.prNumber} ·{" "}
                    <span className="font-mono">{review.headSha.slice(0, 7)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {findings.length === 0 && (
                    <span className="text-[13px] text-muted-foreground">—</span>
                  )}
                  {(["critical", "high", "medium", "low"] as const).map(
                    (severity) => {
                      const count = counts[severity] || 0;
                      if (count === 0) return null;
                      const SeverityIcon = severityIcon(severity);
                      return (
                        <span
                          key={severity}
                          className={`pill pill-${severity}`}
                          title={`${count} ${severity}`}
                        >
                          <SeverityIcon className="h-3.5 w-3.5" />
                          {count}
                        </span>
                      );
                    }
                  )}
                </div>

                <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  {review.status === "completed" && (
                    <>
                      <CircleCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                      <span className="hidden md:inline">Completed</span>
                    </>
                  )}
                  {review.status === "failed" && (
                    <>
                      <CircleX className="h-4 w-4 text-red-600 dark:text-red-500" />
                      <span className="hidden md:inline">Failed</span>
                    </>
                  )}
                  {review.status === "unparsed" && (
                    <>
                      <Siren className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                      <span className="hidden md:inline">Unparsed</span>
                    </>
                  )}
                  {review.status === "pending" && (
                    <>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="hidden md:inline">Running</span>
                    </>
                  )}
                </span>

                <span className="tnum hidden text-[13px] text-muted-foreground md:block md:text-right">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </li>
            );
          })}
          {reviews.length === 0 && (
            <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">
              No reviews yet. Open a repository and review a pull request.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
