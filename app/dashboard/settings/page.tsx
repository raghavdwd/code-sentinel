import { Cpu, KeyRound, Lock, Plug } from "lucide-react";
import { getGithubToken, getGithubUser } from "@/lib/github";
import { getOpenRouterUsage, REVIEW_MODEL } from "@/lib/llm";
import { requireAuth } from "@/modules/auth/utils/auth-utils";
import { ReconnectGithubButton } from "@/modules/auth/components/reconnect-github";

const Row = ({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Plug;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-3 px-4 py-3">
    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
    <span className="w-40 shrink-0 text-[13px] text-muted-foreground">{label}</span>
    <div className="min-w-0 flex-1 text-[13px]">{children}</div>
  </div>
);

export default async function SettingsPage() {
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

  const usage = await getOpenRouterUsage();

  return (
    <div className="mx-auto max-w-[900px] p-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          The connections Code Sentinel reviews with.
        </p>
      </div>

      <section className="mt-6 overflow-hidden rounded-lg border">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-[16px] font-medium">GitHub</h2>
        </header>
        <Row icon={Plug} label="Account">
          {github ? (
            <span className="font-medium">{github.login}</span>
          ) : (
            <span className="text-muted-foreground">
              {githubError || "Not connected"}
            </span>
          )}
        </Row>
        <div className="border-t border-border">
          <Row icon={KeyRound} label="Scopes">
            {github?.scopes ? (
              <span className="font-mono text-[12px]">{github.scopes}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Row>
        </div>
        <div className="border-t border-border px-4 py-3">
          <ReconnectGithubButton />
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-[16px] font-medium">Review model</h2>
        </header>
        <Row icon={Cpu} label="Model">
          <span className="pill pill-brand">{REVIEW_MODEL}</span>
        </Row>
        <div className="border-t border-border">
          <Row icon={Lock} label="API key">
            {process.env.OPENROUTER_API_KEY ? (
              <span className="text-emerald-700 dark:text-emerald-500">
                Configured
              </span>
            ) : (
              <span className="text-severity-critical">
                Missing — set OPENROUTER_API_KEY in .env
              </span>
            )}
          </Row>
        </div>
        {usage?.limit ? (
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-muted-foreground">
                Free-model requests left today
              </span>
              <span className="tnum text-[13px]">
                {usage.remaining} of {usage.limit}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-brand"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, ((usage.limit - (usage.remaining ?? 0)) / usage.limit) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
