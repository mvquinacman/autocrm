import { DueFollowUps } from "@/features/followups/DueFollowUps";

export function FollowUpsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Follow-ups</h1>
      <DueFollowUps />
    </div>
  );
}
