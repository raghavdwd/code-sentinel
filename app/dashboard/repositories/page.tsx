import Link from "next/link";
import { FolderGit } from "lucide-react";
import { getGithubToken, getUserRepos } from "@/lib/github";
import { languageColor } from "@/lib/ui";
import { requireAuth } from "@/modules/auth/utils/auth-utils";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
}

export default async function RepositoriesPage() {
  const session = await requireAuth();
  const token = await getGithubToken(session.user.id);

  if (!token) {
    return (
      <div className="mx-auto max-w-[1204px] p-6">
        <h1 className="text-[22px] font-semibold">Repositories</h1>
        <div className="mt-6 rounded-lg border p-6">
          <p className="text-[14px]">
            Connect GitHub to see the repositories Sentinel can review.
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

  const repos: Repository[] = await getUserRepos(token, 1, 50);

  return (
    <div className="mx-auto max-w-[1204px] p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Repositories
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {repos.length} repositories Sentinel can read pull requests from.
          </p>
        </div>
      </div>

      <section className="mt-6 overflow-hidden rounded-lg border">
        <div className="hidden grid-cols-[minmax(0,1fr)_120px_90px_120px] items-center gap-4 px-4 py-2 text-[12px] text-muted-foreground md:grid">
          <span>Repository</span>
          <span>Language</span>
          <span className="text-right">Stars</span>
          <span className="text-right">Updated</span>
        </div>
        <ul className="divide-y divide-border border-t border-border">
          {repos.map((repo) => {
            const [owner, name] = repo.full_name.split("/");
            return (
              <li
                key={repo.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 md:grid md:grid-cols-[minmax(0,1fr)_120px_90px_120px] md:items-center md:gap-4"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <FolderGit className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/repositories/${owner}/${name}`}
                      className="block truncate text-[14px] font-medium hover:underline"
                    >
                      {repo.full_name}
                    </Link>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {repo.description || "No description"}
                    </p>
                  </div>
                </div>
                <span className="hidden items-center gap-1.5 truncate text-[13px] text-muted-foreground md:flex">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: languageColor(repo.language) }}
                  />
                  {repo.language || "—"}
                </span>
                <span className="tnum text-[13px] md:text-right">
                  {repo.stargazers_count.toLocaleString()}
                </span>
                <span className="tnum hidden text-[13px] text-muted-foreground md:block md:text-right">
                  {new Date(repo.updated_at).toLocaleDateString()}
                </span>
              </li>
            );
          })}
          {repos.length === 0 && (
            <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">
              No repositories found.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
