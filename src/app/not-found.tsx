import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return <main className="not-found-page"><span className="empty-state-icon"><Compass size={24} /></span><p className="eyebrow">404 · WRONG TURN?</p><h1>This page is not on the map.</h1><p>That address does not match an OpportunityBridge page. Let us get you back to a good starting point.</p><Link href="/" className="button button-dark"><ArrowLeft size={16} />Back home</Link></main>;
}
