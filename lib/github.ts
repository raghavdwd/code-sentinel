import prisma from "@/lib/db";
import { githubAxios } from "@/lib/axios";

export const getGithubToken = async (userId: string) => {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "github",
    },
    select: {
      accessToken: true,
    },
  });

  return account?.accessToken;
};

export const getUserRepos = async (
  accessToken: string,
  page: number = 1,
  perPage: number = 10
) => {
  try {
    const api = githubAxios(accessToken);
    const response = await api.get("/user/repos", {
      params: {
        sort: "updated",
        per_page: perPage,
        page: page,
        affiliation: "owner,collaborator,organization_member",
      },
    });

    // Parse link header for pagination info if needed,
    // but for now we'll just return data and assume next page exists if length == perPage
    return response.data;
  } catch (error) {
    console.error("Error fetching repos:", error);
    return [];
  }
};

export interface GithubPullRequest {
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  // Only present on the single pull request endpoint, not on the list endpoint.
  additions?: number;
  deletions?: number;
  changed_files?: number;
  created_at: string;
  updated_at: string;
  user: { login: string };
  head: { sha: string };
}

export interface GithubPullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export const getRepository = async (
  accessToken: string,
  owner: string,
  repo: string
) => {
  const api = githubAxios(accessToken);
  const response = await api.get(`/repos/${owner}/${repo}`);

  return {
    owner: response.data.owner.login as string,
    name: response.data.name as string,
    htmlUrl: response.data.html_url as string,
    description: (response.data.description as string) || null,
    language: (response.data.language as string) || null,
    stars: response.data.stargazers_count as number,
    private: response.data.private as boolean,
  };
};

export const getRepoPullRequests = async (
  accessToken: string,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open"
): Promise<GithubPullRequest[]> => {
  const api = githubAxios(accessToken);
  const response = await api.get(`/repos/${owner}/${repo}/pulls`, {
    params: { state, per_page: 50 },
  });

  return response.data;
};

export interface OpenPullRequest extends GithubPullRequest {
  owner: string;
  repo: string;
  fullName: string;
  language: string | null;
}

export const getOpenPullRequestsAcrossRepos = async (
  accessToken: string,
  repoLimit = 12
): Promise<OpenPullRequest[]> => {
  const repos = await getUserRepos(accessToken, 1, repoLimit);

  const perRepo = await Promise.all(
    repos.map(
      async (repo: { full_name: string; language: string | null }) => {
        const [owner, name] = repo.full_name.split("/");
        try {
          const prs = await getRepoPullRequests(accessToken, owner, name, "open");
          return prs.map((pr) => ({
            ...pr,
            owner,
            repo: name,
            fullName: repo.full_name,
            language: repo.language,
          }));
        } catch {
          return [];
        }
      }
    )
  );

  return perRepo.flat();
};

export const getPullRequest = async (
  accessToken: string,
  owner: string,
  repo: string,
  number: number
): Promise<GithubPullRequest> => {
  const api = githubAxios(accessToken);
  const response = await api.get(
    `/repos/${owner}/${repo}/pulls/${number}`
  );

  return response.data;
};

export const getPullRequestFiles = async (
  accessToken: string,
  owner: string,
  repo: string,
  number: number
): Promise<GithubPullRequestFile[]> => {
  const api = githubAxios(accessToken);
  const response = await api.get(
    `/repos/${owner}/${repo}/pulls/${number}/files`,
    { params: { per_page: 100 } }
  );

  return response.data;
};

export const createPullRequestReview = async (
  accessToken: string,
  owner: string,
  repo: string,
  number: number,
  body: string
) => {
  const api = githubAxios(accessToken);
  const response = await api.post(
    `/repos/${owner}/${repo}/pulls/${number}/reviews`,
    { body, event: "COMMENT" }
  );

  return response.data;
};

export const getGithubUser = async (accessToken: string) => {
  const api = githubAxios(accessToken);
  const response = await api.get("/user");

  return {
    login: response.data.login as string,
    name: (response.data.name as string) || null,
    avatarUrl: (response.data.avatar_url as string) || null,
    scopes: (response.headers["x-oauth-scopes"] as string) || "",
  };
};
