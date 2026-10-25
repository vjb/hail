import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <main id="main" className="stack" style={{ padding: "var(--s-5)" }}>
      <EmptyState title="We couldn't find that page" action={<ButtonLink href="/">Go to Hail</ButtonLink>}>
        The link may be old, or the task may no longer be available.
      </EmptyState>
    </main>
  );
}
