"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  postReviewAction,
  reviewPullRequestAction,
  runReviewAction,
  type ReviewActionState,
} from "@/modules/reviews/actions";

export const ReviewNowButton = ({
  owner,
  repo,
  number,
}: {
  owner: string;
  repo: string;
  number: number;
}) => {
  const [state, formAction, pending] = useActionState<ReviewActionState, FormData>(
    reviewPullRequestAction,
    {}
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="owner" value={owner} />
      <input type="hidden" name="repo" value={repo} />
      <input type="hidden" name="number" value={number} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        className="border-brand/40 text-brand hover:bg-brand/10 hover:text-brand"
        disabled={pending}
      >
        {pending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        {pending ? "Reviewing..." : "Review"}
      </Button>
      {state.error && (
        <p className="mt-1 text-[12px] text-destructive">{state.error}</p>
      )}
    </form>
  );
};

export const RunReviewButton = ({
  owner,
  repo,
  number,
  force = false,
  label,
}: {
  owner: string;
  repo: string;
  number: number;
  force?: boolean;
  label: string;
}) => {
  const [state, formAction, pending] = useActionState<ReviewActionState, FormData>(
    runReviewAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="owner" value={owner} />
      <input type="hidden" name="repo" value={repo} />
      <input type="hidden" name="number" value={number} />
      <input type="hidden" name="force" value={String(force)} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        {pending ? "Reviewing..." : label}
      </Button>
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
};

export const PostReviewButton = ({
  owner,
  repo,
  number,
  reviewId,
}: {
  owner: string;
  repo: string;
  number: number;
  reviewId: number;
}) => {
  const [state, formAction, pending] = useActionState<ReviewActionState, FormData>(
    postReviewAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="owner" value={owner} />
      <input type="hidden" name="repo" value={repo} />
      <input type="hidden" name="number" value={number} />
      <input type="hidden" name="reviewId" value={reviewId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        {pending ? "Posting..." : "Post to GitHub"}
      </Button>
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
};
