"use client";

import { Button, ErrorState } from "@/components/ui";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="stack" style={{ padding: "var(--s-5)" }}>
      <ErrorState title="This page didn't load" action={<Button onClick={reset}>Try again</Button>}>
        Something went wrong on our side. Try again in a moment.
      </ErrorState>
    </main>
  );
}
