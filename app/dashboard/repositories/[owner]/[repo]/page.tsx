import Link from "next/link";
import prisma from "@/lib/db";
import {
  getGithubToken,
  getRepoPullRequests,
  getRepository,
} from "@/lib/github";
import { upsertPullRequest, upsertRepository } from "@/lib/review";
import { requireAuth } from "@/modules/auth/utils/auth-utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PageProps {
  params: Promise<{ owner: string; repo: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { owner, repo } = await params;
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

  const repoInfo = await getRepository(token, owner, repo);
  const repoFullName = `${owner}/${repo}`;
  const pullRequests = await getRepoPullRequests(token, owner, repo, "open");

  const repository = await upsertRepository(session.user.id, repoInfo);
  for (const pr of pullRequests) {
    await upsertPullRequest(session.user.id, repository.id, pr);
  }

  const reviews = await prisma.review.findMany({
    where: { userId: session.user.id, repoFullName },
    orderBy: { createdAt: "desc" },
  });
  const latestReviewByPr = new Map<number, (typeof reviews)[number]>();
  for (const review of reviews) {
    if (!latestReviewByPr.has(review.prNumber)) {
      latestReviewByPr.set(review.prNumber, review);
    }
  }

  return (
    <div className="space-y-6 container mx-auto p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/repositories" className="hover:underline">
            Repositories
          </Link>
          <span>/</span>
          <span>{repoFullName}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{repoInfo.name}</h1>
        <p className="text-muted-foreground">
          {repoInfo.description || "No description available"}
        </p>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {repoInfo.language && <span>{repoInfo.language}</span>}
          <span>{repoInfo.stars} stars</span>
          <a
            href={repoInfo.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            Open on GitHub
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pullRequests.map((pr) => {
          const review = latestReviewByPr.get(pr.number);
          return (
            <Card
              key={pr.number}
              className="flex flex-col h-full hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <CardTitle className="text-lg break-all">
                  <Link
                    href={`/dashboard/repositories/${owner}/${repo}/pulls/${pr.number}`}
                    className="hover:underline hover:text-primary"
                  >
                    {pr.title}
                  </Link>
                </CardTitle>
                <CardDescription>
                  #{pr.number} by {pr.user.login} · updated{" "}
                  {new Date(pr.updated_at ?? pr.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="text-emerald-600">+{pr.additions}</span>
                  <span className="text-red-600">-{pr.deletions}</span>
                  <span>{pr.changed_files} files</span>
                  {review && (
                    <Badge
                      variant={
                        review.status === "completed" ? "secondary" : "outline"
                      }
                      className="ml-auto"
                    >
                      {review.status}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {pullRequests.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No open pull requests.
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;
