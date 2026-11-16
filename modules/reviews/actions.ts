"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { createPullRequestReview, getGithubToken } from "@/lib/github";
import { buildReviewComment, runReview } from "@/lib/review";
import { requireAuth } from "@/modules/auth/utils/auth-utils";

export type ReviewActionState = { error?: string };

const errorMessage = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 401) {
    return "GitHub rejected the token. Reconnect GitHub in Settings and try again.";
  }
  if (status === 403) {
    return "The GitHub token lacks the scope for this repository.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
};

export const runReviewAction = async (
  _prev: ReviewActionState,
  formData: FormData
): Promise<ReviewActionState> => {
  const session = await requireAuth();
  const token = await getGithubToken(session.user.id);
  if (!token) {
    return { error: "GitHub is not connected. Reconnect it in Settings." };
  }

  const owner = String(formData.get("owner"));
  const repo = String(formData.get("repo"));
  const number = Number(formData.get("number"));
  const force = formData.get("force") === "true";

  try {
    await runReview({
      userId: session.user.id,
      token,
      owner,
      repo,
      number,
      force,
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath(`/dashboard/repositories/${owner}/${repo}/pulls/${number}`);
  revalidatePath("/dashboard/reviews");
  return {};
};

export const postReviewAction = async (
  _prev: ReviewActionState,
  formData: FormData
): Promise<ReviewActionState> => {
  const session = await requireAuth();
  const token = await getGithubToken(session.user.id);
  if (!token) {
    return { error: "GitHub is not connected. Reconnect it in Settings." };
  }

  const owner = String(formData.get("owner"));
  const repo = String(formData.get("repo"));
  const number = Number(formData.get("number"));
  const reviewId = Number(formData.get("reviewId"));

  try {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, userId: session.user.id },
    });
    if (!review) {
      return { error: "Review not found." };
    }

    await createPullRequestReview(
      token,
      owner,
      repo,
      number,
      buildReviewComment(review)
    );

    await prisma.review.update({
      where: { id: review.id },
      data: { postedAt: new Date() },
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath(`/dashboard/repositories/${owner}/${repo}/pulls/${number}`);
  revalidatePath("/dashboard/reviews");
  return {};
};
