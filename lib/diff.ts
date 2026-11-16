import type { GithubPullRequestFile } from "@/lib/github";

// ~120k chars is roughly 30k tokens, well inside the 200k context of the free model.
export const MAX_DIFF_CHARS = 120_000;

export const buildDiff = (files: GithubPullRequestFile[]) => {
  const parts: string[] = [];
  const skipped: string[] = [];
  let used = 0;

  for (const file of files) {
    if (!file.patch) {
      skipped.push(`${file.filename} (no patch returned by GitHub)`);
      continue;
    }

    const block = `--- ${file.filename}\n+++ ${file.filename}\n${file.patch}\n`;
    if (used + block.length > MAX_DIFF_CHARS) {
      skipped.push(`${file.filename} (diff budget exhausted)`);
      continue;
    }

    parts.push(block);
    used += block.length;
  }

  return { diff: parts.join(""), skipped };
};
