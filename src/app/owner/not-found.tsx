import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState title="We couldn't find that" action={<ButtonLink href="/owner/tasks">See all tasks</ButtonLink>}>
      The link may be old, or the task belongs to another account.
    </EmptyState>
  );
}
