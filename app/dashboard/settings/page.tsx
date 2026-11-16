import { getGithubToken, getGithubUser } from "@/lib/github";
import { REVIEW_MODEL } from "@/lib/llm";
import { requireAuth } from "@/modules/auth/utils/auth-utils";
import { ReconnectGithubButton } from "@/modules/auth/components/reconnect-github";
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
  const token = await getGithubToken(session.user.id);

  let github: Awaited<ReturnType<typeof getGithubUser>> | null = null;
  let githubError: string | null = null;
  if (token) {
    try {
      github = await getGithubUser(token);
    } catch {
      githubError = "The stored GitHub token was rejected. Reconnect GitHub.";
    }
  }

  return (
    <div className="space-y-6 container mx-auto p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Connections used by Code Sentinel.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GitHub</CardTitle>
          <CardDescription>
            Reviews run with your GitHub token, so Sentinel can read pull
            requests and post review comments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {github ? (
            <div className="space-y-2 text-sm">
              <p>
                Connected as{" "}
                <span className="font-medium">{github.login}</span>
              </p>
              <p className="text-muted-foreground">
                Scopes: {github.scopes || "none reported"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {githubError || "No GitHub account connected."}
            </p>
          )}
          <ReconnectGithubButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review model</CardTitle>
          <CardDescription>
            The model that produces review findings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Model: <Badge variant="secondary">{REVIEW_MODEL}</Badge>
          </p>
          <p className="text-muted-foreground">
            {process.env.OPENROUTER_API_KEY
              ? "OpenRouter API key configured."
              : "OpenRouter API key missing. Set OPENROUTER_API_KEY in .env before running a review."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Page;
