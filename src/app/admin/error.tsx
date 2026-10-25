"use client";

import { Button, ErrorState } from "@/components/ui";

// Shown when a page in this area fails to load. Details are logged on the server, never shown here.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState title="This page didn't load" action={<Button onClick={reset}>Try again</Button>}>
      Something went wrong on our side. Your money and tasks are safe. Try again in a moment.
    </ErrorState>
  );
}
