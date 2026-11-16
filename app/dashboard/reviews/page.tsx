import Link from "next/link";
import prisma from "@/lib/db";
import { getFindings } from "@/lib/review";
import { requireAuth } from "@/modules/auth/utils/auth-utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const Page = async () => {
  const session = await requireAuth();
  const reviews = await prisma.review.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6 container mx-auto p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground">
          Every review Code Sentinel has run for your repositories.
        </p>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => {
          const findings = getFindings(review);
          const critical = findings.filter((f) => f.severity === "critical").length;
          const high = findings.filter((f) => f.severity === "high").length;

          return (
            <Card key={review.id}>
              <CardHeader>
                <CardTitle className="text-lg break-words">
                  <Link
                    href={`/dashboard/repositories/${review.repoFullName}/pulls/${review.prNumber}`}
                    className="hover:underline hover:text-primary"
                  >
                    {review.prTitle}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {review.repoFullName} · #{review.prNumber} ·{" "}
                  {new Date(review.createdAt).toLocaleString()} · {review.model}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-3 flex-wrap text-sm">
                <Badge variant="secondary">{review.status}</Badge>
                <span>{findings.length} findings</span>
                {critical > 0 && (
                  <span className="text-red-600">{critical} critical</span>
                )}
                {high > 0 && <span className="text-orange-600">{high} high</span>}
                {review.postedAt && (
                  <span className="text-muted-foreground">posted to GitHub</span>
                )}
              </CardContent>
            </Card>
          );
        })}
        {reviews.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No reviews yet. Open a repository and review a pull request.
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;
