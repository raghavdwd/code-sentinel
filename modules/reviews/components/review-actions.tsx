"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  postReviewAction,
  runReviewAction,
  type ReviewActionState,
} from "@/modules/reviews/actions";

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
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
      <Button type="submit" variant="outline" disabled={pending}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {pending ? "Posting..." : "Post to GitHub"}
      </Button>
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
};
