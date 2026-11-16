import Link from "next/link";
import prisma from "@/lib/db";
import { getGithubToken, getPullRequest, getPullRequestFiles } from "@/lib/github";
import { getFindings } from "@/lib/review";
import { requireAuth } from "@/modules/auth/utils/auth-utils";
import {
  PostReviewButton,
  RunReviewButton,
} from "@/modules/reviews/components/review-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const severityClass: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-400",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  low: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
};

interface PageProps {
  params: Promise<{ owner: string; repo: string; number: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { owner, repo, number: numberParam } = await params;
  const number = Number(numberParam);
  const session = await requireAuth();
  const token = await getGithubToken(session.user.id);

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">No GitHub account connected.</p>
        <Link
          href="/dashboard/settings"
          className="text-sm underline underline-offset-4"
        >
          Connect GitHub in Settings
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

  return (
    <div className="space-y-6 container mx-auto p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/repositories" className="hover:underline">
            Repositories
          </Link>
          <span>/</span>
          <Link
            href={`/dashboard/repositories/${owner}/${repo}`}
            className="hover:underline"
          >
            {repoFullName}
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight break-words">
          {pr.title} <span className="text-muted-foreground">#{pr.number}</span>
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">{pr.state}</Badge>
          <span>by {pr.user.login}</span>
          <span className="text-emerald-600">+{pr.additions}</span>
          <span className="text-red-600">-{pr.deletions}</span>
          <span>{pr.changed_files} files</span>
          <span>head {pr.head.sha.slice(0, 7)}</span>
          <a
            href={pr.html_url}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            Open on GitHub
          </a>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Code Sentinel review</CardTitle>
          <CardDescription>
            {review
              ? `Last run ${new Date(review.createdAt).toLocaleString()} · model ${review.model} · status ${review.status}`
              : "No review has been run for this pull request yet."}
            {isStale && (
              <span className="ml-2 text-amber-600">
                stale — new commits since this review
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {review?.status === "failed" && (
            <p className="text-sm text-destructive">{review.error}</p>
          )}
          {review?.status === "unparsed" && (
            <p className="text-sm text-muted-foreground">
              The model output could not be parsed as findings. Raw output below.
            </p>
          )}

          {review?.summary && (
            <p className="text-sm whitespace-pre-wrap">{review.summary}</p>
          )}

          {findings.length > 0 && (
            <div className="space-y-3">
              {findings.map((finding, index) => (
                <div
                  key={index}
                  className="rounded-md border p-3 space-y-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={severityClass[finding.severity] ?? ""}
                    >
                      {finding.severity}
                    </Badge>
                    <span className="font-medium">{finding.title}</span>
                    {finding.file && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {finding.line ? `${finding.file}:${finding.line}` : finding.file}
                      </span>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">
                    {finding.description}
                  </p>
                  {finding.suggestedFix && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      <span className="font-medium">Suggested fix:</span>{" "}
                      {finding.suggestedFix}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {skippedFiles.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Files not covered by the model</p>
              <ul className="list-disc pl-5">
                {skippedFiles.map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-start gap-4">
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
            {review?.postedAt && (
              <p className="text-sm text-muted-foreground">
                Posted to GitHub{" "}
                {new Date(review.postedAt).toLocaleString()}.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changed files</CardTitle>
          <CardDescription>{files.length} files</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {files.map((file) => (
              <li
                key={file.filename}
                className="flex items-center gap-3 py-2 text-sm"
              >
                <span className="font-mono break-all">{file.filename}</span>
                <Badge variant="outline">{file.status}</Badge>
                <span className="ml-auto flex items-center gap-3 text-muted-foreground">
                  <span className="text-emerald-600">+{file.additions}</span>
                  <span className="text-red-600">-{file.deletions}</span>
                </span>
              </li>
            ))}
            {files.length === 0 && (
              <li className="py-4 text-sm text-muted-foreground">
                No changed files reported by GitHub.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Page;
