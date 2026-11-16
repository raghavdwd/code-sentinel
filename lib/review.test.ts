import { describe, expect, test } from "bun:test";
import { buildDiff, MAX_DIFF_CHARS } from "./diff";
import { parseReview } from "./llm";

describe("parseReview", () => {
  test("parses plain JSON", () => {
    const result = parseReview(
      JSON.stringify({
        summary: "looks fine",
        findings: [
          {
            severity: "high",
            file: "app/page.tsx",
            line: 12,
            title: "missing await",
            description: "the promise is not awaited",
            suggestedFix: "add await",
          },
        ],
      })
    );

    expect(result?.summary).toBe("looks fine");
    expect(result?.findings).toHaveLength(1);
    expect(result?.findings[0].severity).toBe("high");
  });

  test("parses JSON wrapped in fences and prose", () => {
    const result = parseReview(
      'Here you go:\n```json\n{"summary":"ok","findings":[]}\n```'
    );

    expect(result?.summary).toBe("ok");
    expect(result?.findings).toEqual([]);
  });

  test("returns null for unusable output", () => {
    expect(parseReview("I could not review this diff.")).toBeNull();
  });

  test("drops findings with an unknown severity", () => {
    const result = parseReview(
      JSON.stringify({
        summary: "ok",
        findings: [{ severity: "meh", file: "a.ts", title: "t" }],
      })
    );

    expect(result).toBeNull();
  });
});

describe("buildDiff", () => {
  test("skips files without a patch", () => {
    const { diff, skipped } = buildDiff([
      { filename: "a.ts", status: "modified", additions: 1, deletions: 0, changes: 1 },
      { filename: "b.ts", status: "modified", additions: 1, deletions: 0, changes: 1, patch: "+line" },
    ]);

    expect(diff).toContain("b.ts");
    expect(diff).not.toContain("a.ts");
    expect(skipped).toEqual(["a.ts (no patch returned by GitHub)"]);
  });

  test("stays inside the diff budget and reports skipped files", () => {
    const big = "x".repeat(MAX_DIFF_CHARS);
    const { diff, skipped } = buildDiff([
      { filename: "big.ts", status: "modified", additions: 1, deletions: 0, changes: 1, patch: big },
      { filename: "small.ts", status: "modified", additions: 1, deletions: 0, changes: 1, patch: "+line" },
    ]);

    expect(diff.length).toBeLessThanOrEqual(MAX_DIFF_CHARS + 200);
    expect(skipped).toContain("big.ts (diff budget exhausted)");
    expect(diff).toContain("small.ts");
  });
});
