"use client";

import { ErrorState, Button } from "@mediamatrix/ui";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="page-container flex min-h-[70vh] items-center justify-center pt-24"><ErrorState title="This scene couldn’t load" description="An unexpected error occurred. Your request was not completed; please try again." action={<Button onClick={reset}>Try again</Button>} /><span className="sr-only">{error.digest}</span></div>;
}
