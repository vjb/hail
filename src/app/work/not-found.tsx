import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState title="This task isn't available" action={<ButtonLink href="/work">See open tasks</ButtonLink>}>
      Someone else may have claimed it, or it has closed.
    </EmptyState>
  );
}
