import OpenAI from "openai";
import { z } from "zod";

export const REVIEW_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

export const findingSchema = z.object({
  severity: z.enum(["critical", "high", "medium", "low"]),
  file: z.string().default(""),
  line: z.number().int().nullable().default(null),
  title: z.string().default(""),
  description: z.string().default(""),
  suggestedFix: z.string().nullable().default(null),
});

export const reviewSchema = z.object({
  summary: z.string().default(""),
  findings: z.array(findingSchema).default([]),
});

export type Finding = z.infer<typeof findingSchema>;
export type ReviewResult = z.infer<typeof reviewSchema>;

const SYSTEM_PROMPT = `You are Code Sentinel, a strict senior code reviewer.
Review the unified diff of a pull request and report only real defects: bugs, security issues, correctness errors, performance traps, missing error handling.
Ignore style, formatting and naming unless they break behaviour.
Reply with ONLY a JSON object, no prose and no markdown fences, in exactly this shape:
{"summary":"overall assessment in at most 3 sentences","findings":[{"severity":"critical|high|medium|low","file":"path relative to repo root","line":123,"title":"short title","description":"what is wrong and why it matters","suggestedFix":"concrete fix or null"}]}
Report at most 15 findings, most severe first. If the diff has no real defects, return an empty findings array.`;

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

export const callReviewModel = async (userPrompt: string): Promise<string> => {
  const completion = await client.chat.completions.create({
    model: REVIEW_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  return completion.choices[0]?.message?.content || "";
};

// Free models drift from the requested shape, so parse defensively and keep the
// raw text when it is not usable.
export const parseReview = (raw: string): ReviewResult | null => {
  const withoutFences = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const parsed = reviewSchema.safeParse(
      JSON.parse(withoutFences.slice(start, end + 1))
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
