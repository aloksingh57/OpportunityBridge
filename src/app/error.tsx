"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("OpportunityBridge route rendering failed.", error);
  }, [error]);

  return <main className="not-found-page"><p className="eyebrow">A MOMENTARY PAUSE</p><h1>We could not load this page.</h1><p>Try once more. If the issue continues, check the server logs and local demo data configuration.</p><div className="error-actions"><button type="button" className="button button-dark" onClick={reset}><RefreshCw size={16} />Try again</button><Link href="/" className="button button-light">Return home</Link></div></main>;
}
