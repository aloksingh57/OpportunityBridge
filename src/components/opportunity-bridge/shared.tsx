"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Check,
  Clock3,
  MapPin,
  Bell,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Opportunity, PublicUser } from "@/types/opportunity-bridge";

export const publicNavigation = [
  { href: "/opportunities", label: "Opportunities" },
  { href: "/startups", label: "Startups" },
  { href: "/people", label: "People" },
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How it works" },
];

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand ${compact ? "brand-compact" : ""}`} href="/" aria-label="OpportunityBridge home">
      <span className="brand-mark"><BriefcaseBusiness size={19} strokeWidth={2.1} /></span>
      <span>opportunity<span className="brand-bridge">bridge</span><small>Where Opportunity Meets Potential.</small></span>
    </Link>
  );
}

export function PublicNav({
  currentUser,
  onSwitchDemo,
  onSignOut,
  unreadCount,
  demoPeople,
  isAdmin = false,
}: {
  currentUser: PublicUser | null;
  onSwitchDemo?: (id: string) => void;
  onSignOut?: () => void;
  unreadCount?: number;
  demoPeople: PublicUser[];
  isAdmin?: boolean;
}) {
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          {publicNavigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <div className="nav-actions">
          <Link className="nav-icon-link" href="/opportunities" aria-label="Search opportunities"><Search size={17} /></Link>
          {currentUser || isAdmin ? (
            <>
              <Link className="nav-notification" href="/notifications" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
                <Bell size={17} />{unreadCount ? <b>{unreadCount}</b> : null}
              </Link>
              {isAdmin ? <span className="admin-nav-label"><ShieldCheck size={14} />Admin session</span> : onSwitchDemo && currentUser ? (
                <label className="nav-persona-label">
                  <span className="sr-only">Switch demo profile</span>
                  <select
                    className="nav-persona"
                    value={currentUser.id}
                    onChange={(event) => onSwitchDemo(event.target.value)}
                    aria-label="Switch demo profile"
                  >
                    {demoPeople.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.roles.map((role) => role.replace("-", " ")).join(", ")}</option>)}
                  </select>
                </label>
              ) : currentUser ? <Link className="nav-profile" href="/dashboard"><span className="avatar avatar-small">{currentUser.avatar}</span><span>{currentUser.name.split(" ")[0]}</span></Link> : null}
              {onSignOut ? <button className="nav-sign-out" type="button" onClick={onSignOut}>Sign out</button> : null}
            </>
          ) : <><Link className="nav-login" href="/login">Log in</Link><Link className="button button-dark button-small" href="/register">Get started <ArrowRight size={15} /></Link></>}
        </div>
        <details className="mobile-nav">
          <summary aria-label="Open navigation menu"><span /><span /><span /></summary>
          <nav aria-label="Mobile navigation">
            {publicNavigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            {currentUser || isAdmin ? <Link href="/dashboard">Your dashboard</Link> : <><Link href="/login">Log in</Link><Link href="/register">Get started</Link></>}
          </nav>
        </details>
      </div>
      {currentUser ? (
        <div className="member-nav">
          <span className="member-nav-label">YOUR SPACE</span>
          <Link href="/dashboard">Overview</Link>
          <Link href="/saved">Saved</Link>
          <Link href="/applications">Applications</Link>
          <Link href="/connections">Connections</Link>
          <Link href="/sessions">Sessions</Link>
          <Link href="/messages">Messages</Link>
          <Link href="/recommendations">For you</Link>
          {currentUser.roles.some((role) => role === "founder" || role === "recruiter") ? <Link href="/manage-opportunities">Manage listings</Link> : null}
        </div>
      ) : null}
    </header>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}<h1>{title}</h1>{description ? <p className="page-description">{description}</p> : null}</div>
      {action ? <div className="page-heading-action">{action}</div> : null}
    </div>
  );
}

export function OpportunityCard({
  opportunity,
  publisher,
  saved,
  onSave,
  compact = false,
  score,
}: {
  opportunity: Opportunity;
  publisher?: PublicUser;
  saved: boolean;
  onSave: (opportunity: Opportunity) => void;
  compact?: boolean;
  score?: number;
}) {
  const deadline = new Date(opportunity.deadline);
  return (
    <article className={`opportunity-card ${compact ? "opportunity-card-compact" : ""}`}>
      <div className="opportunity-card-top">
        <span className={`category-mark category-${categoryTone(opportunity.category)}`}><Building2 size={17} /></span>
        <button className={`icon-button save-button ${saved ? "is-saved" : ""}`} type="button" onClick={() => onSave(opportunity)} aria-label={saved ? `Remove ${opportunity.title} from saved` : `Save ${opportunity.title}`}>
          {saved ? <Check size={17} /> : <Bookmark size={17} />}
        </button>
      </div>
      <div className="opportunity-card-title">
        <span className="demo-pill">DEMO LISTING</span>
        {score !== undefined ? <span className="score-label"><Sparkles size={13} /> {score}% match</span> : null}
        <Link href={`/opportunities/${opportunity.id}`}><h3>{opportunity.title}</h3></Link>
        <p className="company-line">{opportunity.organization}</p>
      </div>
      <div className="opportunity-meta">
        <span><MapPin size={14} />{opportunity.remote ? "Remote" : opportunity.location}</span>
        <span><Clock3 size={14} />{deadline.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} deadline</span>
      </div>
      {!compact ? <p className="opportunity-description">{opportunity.description}</p> : null}
      <div className="skill-list">{opportunity.skills.slice(0, compact ? 2 : 4).map((skill) => <span className="skill-pill" key={skill}>{skill}</span>)}</div>
      <div className="opportunity-card-footer">
        <div className="compensation">{formatCompensation(opportunity)}<small>{publisher ? `Posted by ${publisher.name}` : opportunity.type.replaceAll("-", " ")}</small></div>
        <Link className="text-link" href={`/opportunities/${opportunity.id}`}>View details <ArrowRight size={15} /></Link>
      </div>
    </article>
  );
}

export function PersonAvatar({ person, large = false }: { person: PublicUser; large?: boolean }) {
  return <span className={`avatar ${large ? "avatar-large" : ""}`} aria-hidden="true">{person.avatar}</span>;
}

export function DemoBanner() {
  return <div className="demo-banner"><Sparkles size={14} /><span><strong>Local demo experience</strong> · Profiles, organizations, listings, activity and metrics are fictional sample data.</span></div>;
}

export function formatCompensation(opportunity: Opportunity): string {
  if (opportunity.compensationMin === null || opportunity.compensationMax === null) return opportunity.compensationUnit;
  const formatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  const range = opportunity.compensationMin === opportunity.compensationMax
    ? formatter.format(opportunity.compensationMin)
    : `${formatter.format(opportunity.compensationMin)} – ${formatter.format(opportunity.compensationMax)}`;
  return `${range} ${opportunity.compensationUnit}`;
}

export function categoryTone(category: string): string {
  const value = category.toLowerCase();
  if (value.includes("design") || value.includes("mentor")) return "lilac";
  if (value.includes("data") || value.includes("scholar")) return "sky";
  if (value.includes("climate") || value.includes("fund")) return "mint";
  if (value.includes("business") || value.includes("advis")) return "peach";
  return "blue";
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main"><div><Brand compact /><p>A thoughtful place to find the next step, person, or idea that moves you forward.</p></div>
        <div className="footer-links"><div><strong>Explore</strong><Link href="/opportunities">Opportunities</Link><Link href="/people">People</Link><Link href="/how-it-works">How it works</Link></div><div><strong>OpportunityBridge</strong><Link href="/about">About us</Link><Link href="/contact">Contact</Link><Link href="/login">Demo sign in</Link></div></div></div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} OpportunityBridge</span><span>Thoughtfully built for discovery. Sample content is always labeled.</span><Link href="/settings">Privacy & settings</Link></div>
    </footer>
  );
}
