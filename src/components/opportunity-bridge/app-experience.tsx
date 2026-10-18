"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Ban,
  BadgeCheck,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  CircleHelp,
  Compass,
  FileCheck2,
  Filter,
  Handshake,
  HeartHandshake,
  Lightbulb,
  List,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Flag,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { recommendOpportunities } from "@/lib/recommendations";
import type {
  ApplicationStatus,
  BootstrapData,
  Opportunity,
  OpportunityType,
  PublicUser,
  Role,
} from "@/types/opportunity-bridge";
import {
  DemoBanner,
  OpportunityCard,
  PageHeading,
  PersonAvatar,
  PublicNav,
  SiteFooter,
  formatCompensation,
} from "@/components/opportunity-bridge/shared";

type Props = { path: string[]; initialData: BootstrapData };
type Flash = { tone: "success" | "error" | "info"; message: string } | null;

const roleNames: Record<Role, string> = {
  student: "Student",
  "job-seeker": "Job seeker",
  founder: "Founder",
  investor: "Investor",
  mentor: "Mentor",
  advisor: "Advisor",
  recruiter: "Recruiter",
};

const opportunityTypeNames: Record<OpportunityType, string> = {
  internship: "Internship",
  "full-time": "Full-time job",
  "part-time": "Part-time job",
  freelance: "Freelance project",
  "student-project": "Student project",
  scholarship: "Scholarship",
  hackathon: "Hackathon",
  "startup-funding": "Startup funding",
  mentorship: "Mentorship",
  advisory: "Advisory",
};

const typeOptions = Object.entries(opportunityTypeNames) as Array<[OpportunityType, string]>;

const protectedRoutes = [
  "/onboarding", "/dashboard", "/profile", "/settings", "/notifications", "/messages", "/connections",
  "/saved", "/applications", "/publish", "/manage-opportunities", "/manage-applicants", "/recommendations", "/sessions",
];

export function isProtectedPath(path: string): boolean {
  return protectedRoutes.some((route) => path === route || path.startsWith(`${route}/`));
}

export function AppExperience({ path: segments, initialData }: Props) {
  const router = useRouter();
  const path = `/${segments.join("/")}`;
  const data = initialData;
  const [flash, setFlash] = useState<Flash>(null);
  const [busy, setBusy] = useState(false);

  async function refreshData() {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "The demo data could not be refreshed.");
    return payload as BootstrapData;
  }

  async function postJson<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "The request could not be completed.";
      throw new Error(message);
    }
    return payload as T;
  }

  async function performAction(body: unknown) {
    setBusy(true);
    setFlash(null);
    try {
      const result = await postJson<{ message: string }>("/api/actions", body);
      setFlash({ tone: "success", message: result.message });
      router.refresh();
    } catch (error) {
      setFlash({ tone: "error", message: error instanceof Error ? error.message : "The change could not be saved." });
    } finally {
      setBusy(false);
    }
  }

  async function switchDemo(userId: string) {
    setBusy(true);
    setFlash(null);
    try {
      await postJson("/api/session", { demoUserId: userId });
      router.push("/dashboard");
    } catch (error) {
      setFlash({ tone: "error", message: error instanceof Error ? error.message : "That demo profile could not be selected." });
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      const response = await fetch("/api/session", { method: "DELETE" });
      if (!response.ok) throw new Error("You could not be signed out. Please retry.");
      router.push("/");
    } catch (error) {
      setFlash({ tone: "error", message: error instanceof Error ? error.message : "Sign out failed." });
      setBusy(false);
    }
  }

  const content = renderRoute(path, segments, data, {
    flash,
    busy,
    performAction,
    postJson,
    refreshData,
    switchDemo,
    navigate: (href) => {
      if (href === path) router.refresh();
      else router.push(href);
    },
  });

  return (
    <div className="app-root">
      <DemoBanner />
      <PublicNav
        currentUser={data.currentUser}
        demoPeople={data.people}
        onSwitchDemo={data.currentUser ? switchDemo : undefined}
        onSignOut={data.currentUser || data.isAdmin ? signOut : undefined}
        isAdmin={data.isAdmin}
        unreadCount={data.metrics.unreadNotifications}
      />
      <main id="main-content" className={`main-content ${path === "/" ? "main-home" : ""}`}>
        {flash ? <FlashMessage flash={flash} onDismiss={() => setFlash(null)} /> : null}
        {content.node}
      </main>
      <SiteFooter />
      {busy ? <div className="busy-indicator" role="status"><LoaderCircle size={15} className="spin" /> Saving your change…</div> : null}
    </div>
  );
}

type RouteContext = {
  flash: Flash;
  busy: boolean;
  performAction: (body: unknown) => Promise<void>;
  postJson: <T>(url: string, body: unknown) => Promise<T>;
  refreshData: () => Promise<BootstrapData>;
  switchDemo: (userId: string) => Promise<void>;
  navigate: (href: string) => void;
};

type RenderedRoute = { node: React.ReactNode; propsHasFlash: boolean };

function renderRoute(path: string, segments: string[], data: BootstrapData, context: RouteContext): RenderedRoute {
  if (path === "/") return { node: <LandingPage data={data} context={context} />, propsHasFlash: false };
  if (path === "/opportunities") return { node: <Marketplace data={data} context={context} />, propsHasFlash: false };
  if (path === "/startups") return { node: <StartupDirectory data={data} context={context} />, propsHasFlash: false };
  if (path.startsWith("/opportunities/")) return { node: <OpportunityDetail id={segments[1] ?? ""} data={data} context={context} />, propsHasFlash: false };
  if (path === "/people") return { node: <PeopleDirectory data={data} context={context} />, propsHasFlash: false };
  if (path.startsWith("/people/")) return { node: <PersonDetail id={segments[1] ?? ""} data={data} context={context} />, propsHasFlash: false };
  if (path === "/login") return { node: <LoginPage data={data} context={context} />, propsHasFlash: true };
  if (path === "/register") return { node: <RegisterPage data={data} context={context} />, propsHasFlash: true };
  if (path === "/forgot-password") return { node: <InfoPage title="Your demo account is ready when you are." description="OpportunityBridge runs a local demo login and does not store account passwords. Choose a demo profile on the sign-in page to get started, or create a local demo profile." action={<Link className="button button-dark" href="/login">Choose a demo profile <ArrowRight size={16} /></Link>} />, propsHasFlash: false };
  if (path === "/about") return { node: <AboutPage />, propsHasFlash: false };
  if (path === "/how-it-works") return { node: <HowItWorksPage />, propsHasFlash: false };
  if (path === "/contact") return { node: <ContactPage context={context} />, propsHasFlash: true };
  if (path === "/onboarding") return { node: <OnboardingPage data={data} />, propsHasFlash: false };
  if (path === "/dashboard") return { node: <DashboardPage key={`${data.currentUser?.id ?? "guest"}:${data.currentUser?.roles.join("|") ?? ""}`} data={data} context={context} />, propsHasFlash: false };
  if (path === "/profile") return { node: <ProfilePage data={data} context={context} />, propsHasFlash: true };
  if (path === "/settings") return { node: <SettingsPage data={data} context={context} />, propsHasFlash: true };
  if (path === "/notifications") return { node: <NotificationsPage data={data} context={context} />, propsHasFlash: true };
  if (path === "/messages") return { node: <MessagesPage data={data} context={context} />, propsHasFlash: true };
  if (path === "/connections") return { node: <ConnectionsPage data={data} context={context} />, propsHasFlash: true };
  if (path === "/saved") return { node: <SavedPage data={data} context={context} />, propsHasFlash: true };
  if (path === "/applications") return { node: <ApplicationsPage data={data} />, propsHasFlash: true };
  if (path.startsWith("/applications/")) return { node: <ApplicationDetail id={segments[1] ?? ""} data={data} context={context} />, propsHasFlash: true };
  if (path === "/publish") return { node: <PublishPage data={data} context={context} />, propsHasFlash: true };
  if (path === "/manage-opportunities") return { node: <ManageOpportunitiesPage data={data} />, propsHasFlash: false };
  if (path === "/manage-applicants") return { node: <ManageApplicantsPage data={data} context={context} />, propsHasFlash: true };
  if (path === "/recommendations") return { node: <RecommendationsPage data={data} context={context} />, propsHasFlash: false };
  if (path === "/sessions") return { node: <SessionsPage data={data} context={context} />, propsHasFlash: true };
  if (path === "/admin" || path === "/admin/users" || path === "/admin/opportunities") return { node: <AdminPage path={path} data={data} context={context} />, propsHasFlash: true };
  return { node: <InfoPage title="We couldn?t find that page." description="This address does not match an OpportunityBridge page. Try one of the links below." action={<Link className="button button-dark" href="/">Go to the home page <ArrowRight size={16} /></Link>} />, propsHasFlash: false };
}

function FlashMessage({ flash, onDismiss }: { flash: NonNullable<Flash>; onDismiss?: () => void }) {
  return (
    <div className={`flash-message flash-${flash.tone}`} role={flash.tone === "error" ? "alert" : "status"} aria-live="polite">
      {flash.tone === "success" ? <Check size={17} /> : flash.tone === "error" ? <CircleHelp size={17} /> : <Sparkles size={17} />}
      <span>{flash.message}</span>
      {onDismiss ? <button type="button" aria-label="Dismiss message" onClick={onDismiss}><X size={16} /></button> : null}
    </div>
  );
}

function LandingPage({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const featured = data.opportunities.filter((opportunity) => opportunity.status === "published").slice(0, 3);
  const featuredPeople = data.people.filter((person) => person.roles.some((role) => ["mentor", "founder", "investor"].includes(role))).slice(0, 4);
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="hero-availability"><span className="availability-dot" /> A brighter way to find your next step</div>
          <h1>Your next big<br />opportunity <span>starts here.</span></h1>
          <p>Find the work, people, and ideas that move you forward. OpportunityBridge brings your next possibility within reach.</p>
          <div className="hero-actions"><Link className="button button-dark" href="/opportunities">Explore opportunities <ArrowRight size={17} /></Link><Link className="button button-light" href={data.currentUser ? "/dashboard" : "/register"}>{data.currentUser ? "Go to your space" : "Join OpportunityBridge"}</Link></div>
          <div className="hero-note"><span className="avatar-stack"><i>AS</i><i>PM</i><i>MN</i><i>DP</i></span><span>Explore a friendly, fictional demo community <strong>— no account needed to look around.</strong></span></div>
        </div>
        <div className="hero-visual" aria-label="Illustration of connected opportunities">
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-orbit orbit-three" />
          <div className="hero-center"><span><Compass size={36} strokeWidth={1.5} /></span><strong>Find your<br />next direction</strong><small>Curiosity takes you places.</small></div>
          <div className="floating-opportunity float-internship"><span className="float-icon float-lilac"><BriefcaseBusiness size={17} /></span><div><b>Product design</b><small>Internship · Remote</small></div><span className="float-dot" /></div>
          <div className="floating-opportunity float-mentor"><span className="float-icon float-mint"><HeartHandshake size={17} /></span><div><b>Meet a mentor</b><small>Meera Nair · Demo profile</small></div><ArrowUpRight size={16} /></div>
          <div className="floating-opportunity float-funding"><span className="float-icon float-peach"><Lightbulb size={17} /></span><div><b>Founder funding</b><small>Sample listings · fictional</small></div><Sparkles size={15} /></div>
          <div className="hero-art-caption"><span>01</span><span>Make your next move a little closer.</span></div>
        </div>
        <div className="hero-stamp"><Sparkles size={14} /> A place to begin</div>
      </section>

      <section className="trust-strip" aria-label="Demo community categories">
        <span>MADE FOR EVERY NEXT STEP</span><b>Students</b><b>Founders</b><b>Mentors</b><b>Investors</b><b>Recruiters</b><small>Community profiles shown are demos</small>
      </section>

      <section className="section section-how">
        <SectionIntro eyebrow="A path that makes sense" title="From “what if?” to “what’s next?”" description="A little less searching alone. A lot more moving forward, together." />
        <div className="steps-grid">{[
          ["01", "Create your profile", "Tell your story, add a few skills, and show people what you care about.", <Users key="create-profile" size={21} />],
          ["02", "Find your next step", "Explore internships, projects, funding, mentors, and more in one place.", <Compass key="find-next-step" size={21} />],
          ["03", "Connect with people", "Meet founders, recruiters, advisors, and kind people who want to help.", <Handshake key="connect-with-people" size={21} />],
          ["04", "Make it happen", "Apply, exchange a note, and keep each step in view.", <ArrowUpRight key="make-it-happen" size={21} />],
        ].map(([number, title, description, icon]) => <article className="step-card" key={String(number)}><div className="step-top"><span>{number}</span><i>{icon}</i></div><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>

      <section className="section section-opportunities">
        <SectionIntro eyebrow="A few places to start" title="Good things are out there." description="Explore a sample of the opportunities in our fictional demo collection." action={<Link className="text-link" href="/opportunities">Browse all opportunities <ArrowRight size={16} /></Link>} />
        <div className="opportunity-grid">{featured.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} publisher={data.people.find((person) => person.id === opportunity.publisherId)} saved={data.savedOpportunityIds.includes(opportunity.id)} onSave={() => handleSave(opportunity, data, context)} />)}</div>
      </section>

      <section className="section people-showcase">
        <div className="people-showcase-art"><div className="people-art-blob" /><div className="people-art-orbit" /><div className="people-art-card people-art-card-one"><PersonAvatar person={featuredPeople[1]!} /><span><b>{featuredPeople[1]?.name}</b><small>Founder · fictional profile</small></span></div><div className="people-art-card people-art-card-two"><PersonAvatar person={featuredPeople[0]!} /><span><b>{featuredPeople[0]?.name}</b><small>Mentor · demo profile</small></span></div><div className="people-art-bubble"><HeartHandshake size={22} /></div></div>
        <div className="people-showcase-copy"><p className="eyebrow">People make the difference</p><h2>The right conversation can change your direction.</h2><p>Find mentors, founders, investors, recruiters, and fellow builders who understand where you want to go.</p><div className="role-chips"><span>Students</span><span>Founders</span><span>Investors</span><span>Mentors</span><span>Advisors</span><span>Recruiters</span></div><Link className="button button-dark" href="/people">Meet the community <ArrowRight size={17} /></Link></div>
      </section>

      <section className="section trust-metrics">
        <p className="eyebrow">A growing idea, in miniature</p><h2>Big possibilities begin with small steps.</h2><p className="trust-metrics-caption">Illustrative numbers from this fictional local demo — not real platform activity.</p>
        <div className="metric-row"><div><strong>{data.people.length}+</strong><span>sample community profiles</span></div><div><strong>{data.opportunities.filter((opportunity) => opportunity.status === "published").length}+</strong><span>fictional listings to explore</span></div><div><strong>{data.applications.length}+</strong><span>sample application journeys</span></div></div>
      </section>

      <section className="section testimonial-section"><div className="quote-mark">“</div><blockquote>“I found a mentor who helped me ask a better question. That was the moment everything felt possible.”</blockquote><div className="quote-author"><span className="avatar avatar-small">PM</span><span><b>Priya Mehta</b><small>Student · fictional demo testimonial</small></span></div><span className="quote-footnote">Fictional quote for product demonstration</span></section>

      <section className="final-cta"><div><p className="eyebrow">The next step is yours</p><h2>There’s a place for what you want to become.</h2><p>Explore freely. Join a demo profile. Find something that feels like your next move.</p></div><Link className="button button-white" href="/opportunities">Find an opportunity <ArrowRight size={17} /></Link><span className="cta-flower" aria-hidden="true">✳</span></section>
    </>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return <div className="section-intro"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>{action ? <div className="section-intro-action">{action}</div> : null}</div>;
}

async function handleSave(opportunity: Opportunity, data: BootstrapData, context: RouteContext) {
  if (!data.currentUser) {
    context.navigate("/login");
    return;
  }
  await context.performAction({
    type: "save-opportunity",
    opportunityId: opportunity.id,
    saved: !data.savedOpportunityIds.includes(opportunity.id),
  });
}

function Marketplace({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sort, setSort] = useState("relevance");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(12);
  const user = data.currentUser;
  const recommendations = useMemo(
    () => user ? recommendOpportunities(findStoredUser(user, data.people), data.opportunities.filter((item) => item.status === "published")) : [],
    [data.opportunities, data.people, user],
  );
  const scoreById = useMemo(() => new Map(recommendations.map((item) => [item.opportunity.id, item.score])), [recommendations]);
  const categories = Array.from(new Set(data.opportunities.map((item) => item.category))).sort();
  const skills = Array.from(new Set(data.opportunities.flatMap((item) => item.skills))).sort();
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const results = data.opportunities.filter((opportunity) => {
      if (opportunity.status !== "published" || new Date(opportunity.deadline) < new Date()) return false;
      if (typeFilter && opportunity.type !== typeFilter) return false;
      if (categoryFilter && opportunity.category !== categoryFilter) return false;
      if (remoteOnly && !opportunity.remote) return false;
      if (locationFilter && !opportunity.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      if (skillFilter && !opportunity.skills.some((skill) => skill.toLowerCase() === skillFilter.toLowerCase())) return false;
      if (experienceFilter && opportunity.experienceLevel !== experienceFilter) return false;
      return !search || [
        opportunity.title, opportunity.organization, opportunity.description, opportunity.category,
        opportunity.skills.join(" "), opportunity.location,
      ].join(" ").toLowerCase().includes(search);
    });
    if (sort === "newest") return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === "deadline") return results.sort((a, b) => a.deadline.localeCompare(b.deadline));
    if (sort === "compensation") return results.sort((a, b) => (b.compensationMax ?? 0) - (a.compensationMax ?? 0));
    return results.sort((a, b) => (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0));
  }, [data.opportunities, query, typeFilter, categoryFilter, remoteOnly, locationFilter, skillFilter, experienceFilter, sort, scoreById]);
  const activeFilters = Boolean(query || typeFilter || categoryFilter || locationFilter || skillFilter || experienceFilter || remoteOnly);
  const resetFilters = () => {
    setQuery(""); setTypeFilter(""); setCategoryFilter(""); setLocationFilter(""); setSkillFilter("");
    setExperienceFilter(""); setRemoteOnly(false); setSort("relevance"); setVisibleCount(12);
  };
  return (
    <div className="content-page marketplace-page">
      <PageHeading eyebrow="The opportunity marketplace" title="Find a next step that feels like you." description="Search one thoughtful collection of internships, jobs, projects, funding, and people who can help." action={<span className="count-chip">{filtered.length} open in this demo</span>} />
      <div className="marketplace-toolbar"><label className="search-control"><Search size={18} /><span className="sr-only">Search opportunities</span><input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(12); }} placeholder="Try “design”, “remote”, or “React”" /></label><label className="select-control"><ArrowDownWideNarrow size={15} /><span className="sr-only">Sort opportunities</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevance">Best fit for me</option><option value="newest">Newest first</option><option value="deadline">Deadline soonest</option><option value="compensation">Compensation</option></select></label><div className="view-toggle" aria-label="View format"><button className={view === "grid" ? "selected" : ""} type="button" onClick={() => setView("grid")} aria-label="Grid view">▦</button><button className={view === "list" ? "selected" : ""} type="button" onClick={() => setView("list")} aria-label="List view"><List size={17} /></button></div></div>
      <div className="marketplace-layout">
        <aside className="filter-panel">
          <div className="filter-title"><Filter size={17} /><strong>Refine your search</strong>{activeFilters ? <button type="button" className="text-button" onClick={resetFilters}>Clear all</button> : null}</div>
          <label>Opportunity type<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">All types</option>{typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Location<input value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} placeholder="City or region" /></label>
          <label>Skill<select value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)}><option value="">Any skill</option>{skills.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Experience level<select value={experienceFilter} onChange={(event) => setExperienceFilter(event.target.value)}><option value="">Any level</option><option value="student">Student</option><option value="entry">Entry</option><option value="mid">Mid-level</option><option value="senior">Senior</option></select></label>
          <label className="checkbox-filter"><input type="checkbox" checked={remoteOnly} onChange={(event) => setRemoteOnly(event.target.checked)} /> Remote-friendly only</label>
          <div className="filter-note"><Sparkles size={15} /><span>For-you sorting uses profile skills, interests, role, location, and experience. It is a discovery estimate — not a hiring prediction.</span></div>
        </aside>
        <section className="results-area" aria-label="Opportunity results" aria-live="polite">
          <div className="results-summary"><span><strong>{filtered.length}</strong> opportunities match your search</span>{activeFilters ? <span>Filters are updating live</span> : <span>Fictional sample listings · demo only</span>}</div>
          {filtered.length ? <div className={`opportunity-grid ${view === "list" ? "opportunity-list-view" : ""}`}>{filtered.slice(0, visibleCount).map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} publisher={data.people.find((person) => person.id === opportunity.publisherId)} saved={data.savedOpportunityIds.includes(opportunity.id)} onSave={() => handleSave(opportunity, data, context)} score={sort === "relevance" ? scoreById.get(opportunity.id) : undefined} />)}</div> : <EmptyState title="Nothing matches this search yet." body="Try a broader search, remove one filter, or explore all opportunities." action={<button type="button" className="button button-light" onClick={resetFilters}>Clear filters</button>} />}
          {filtered.length > visibleCount ? <div className="load-more"><button type="button" className="button button-light" onClick={() => setVisibleCount((count) => count + 12)}>Show more ({filtered.length - visibleCount} remaining) <ChevronDown size={16} /></button></div> : null}
        </section>
      </div>
    </div>
  );
}

function findStoredUser(person: PublicUser, people: PublicUser[]) {
  const profile = people.find((item) => item.id === person.id);
  return profile ? { ...profile, email: "", status: "active" as const } : {
    ...person,
    email: "",
    status: "active" as const,
  };
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-state-icon"><Compass size={22} /></span><h3>{title}</h3><p>{body}</p>{action ? <div className="empty-state-action">{action}</div> : null}</div>;
}

function StartupDirectory({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("");
  const [stage, setStage] = useState("");
  const industries = Array.from(new Set(data.startups.map((startup) => startup.industry))).sort();
  const startups = data.startups.filter((startup) => {
    if (industry && startup.industry !== industry) return false;
    if (stage && startup.stage !== stage) return false;
    const term = query.trim().toLowerCase();
    return !term || [startup.name, startup.industry, startup.summary, startup.founder.name, startup.founder.headline].join(" ").toLowerCase().includes(term);
  });
  return <div className="content-page"><PageHeading eyebrow="For founders and investors" title="Ideas worth getting to know." description="Explore fictional startup profiles by industry and stage, then connect with their founders to learn more." action={<span className="count-chip">{startups.length} sample startups</span>} />
    <div className="startup-toolbar"><label className="search-control"><Search size={17} /><span className="sr-only">Search startup profiles</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a company, industry, or founder" /></label><label>Industry<select value={industry} onChange={(event) => setIndustry(event.target.value)}><option value="">All industries</option>{industries.map((item) => <option key={item}>{item}</option>)}</select></label><label>Stage<select value={stage} onChange={(event) => setStage(event.target.value)}><option value="">All stages</option>{["idea", "pre-seed", "seed", "series-a"].map((item) => <option value={item} key={item}>{item.replace("-", " ")}</option>)}</select></label></div>
    <p className="results-summary">All funding details and organizations below are fictional demonstration data, not investment offers.</p>
    {startups.length ? <div className="startup-grid">{startups.map((startup) => <article className="startup-card" key={startup.id}><div className="startup-card-head"><span className="category-mark category-mint"><Lightbulb size={18} /></span><span className="demo-pill">DEMO STARTUP</span></div><p className="eyebrow">{startup.industry}</p><h2>{startup.name}</h2><span className="startup-stage">{startup.stage.replace("-", " ")}</span><p>{startup.summary}</p><div className="startup-funding"><span>Funding signal <strong>{startup.fundingAskInr === null ? "Exploring" : `₹${new Intl.NumberFormat("en-IN").format(startup.fundingAskInr)}`}</strong></span><Link className="text-link" href={`/people/${startup.founder.id}`}>Founder profile <ArrowRight size={14} /></Link></div><PersonCard person={startup.founder} data={data} context={context} /></article>)}</div> : <EmptyState title="No startups match these filters." body="Try a different industry, stage, or search term." action={<button type="button" className="button button-light" onClick={() => { setIndustry(""); setStage(""); setQuery(""); }}>Clear filters</button>} />}
  </div>;
}

function OpportunityDetail({ id, data, context }: { id: string; data: BootstrapData; context: RouteContext }) {
  const opportunity = data.opportunities.find((item) => item.id === id);
  if (!opportunity || (opportunity.status !== "published" && opportunity.publisherId !== data.currentUser?.id && !data.isAdmin)) {
    return <InfoPage title="This opportunity isn?t available." description="It may have closed, reached its deadline, or been removed from the public marketplace." action={<Link className="button button-dark" href="/opportunities">Back to opportunities <ArrowRight size={16} /></Link>} />;
  }
  const publisher = data.people.find((person) => person.id === opportunity.publisherId);
  const hasApplied = data.applications.some((application) => application.opportunityId === opportunity.id && application.applicantId === data.currentUser?.id);
  const canApply = Boolean(data.currentUser?.roles.some((role) => role === "student" || role === "job-seeker"));
  const deadlinePassed = new Date(opportunity.deadline) < new Date();
  const related = data.opportunities.filter((item) => item.id !== opportunity.id && item.status === "published" && item.category === opportunity.category).slice(0, 2);
  return (
    <div className="content-page detail-page">
      <Link className="back-link" href="/opportunities"><ArrowLeft size={16} /> All opportunities</Link>
      <div className="detail-grid">
        <article className="detail-main">
          <div className="detail-hero"><span className="demo-pill">FICTIONAL DEMO LISTING</span><span className="detail-category">{opportunity.category}</span><h1>{opportunity.title}</h1><p className="company-line">{opportunity.organization}</p><div className="detail-meta"><span><MapPin size={15} />{opportunity.remote ? "Remote friendly" : opportunity.location}</span><span>{opportunityTypeNames[opportunity.type]}</span><span>Deadline {new Date(opportunity.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span></div></div>
          <section className="detail-section"><p className="eyebrow">The opportunity</p><h2>What you’ll do</h2><p>{opportunity.description}</p><ul className="check-list">{opportunity.responsibilities.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul></section>
          <section className="detail-section"><p className="eyebrow">Could this be you?</p><h2>What would help</h2><ul className="check-list">{opportunity.eligibility.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul><div className="skill-list skill-list-large">{opportunity.skills.map((skill) => <span className="skill-pill" key={skill}>{skill}</span>)}</div></section>
          {canApply && !deadlinePassed && !hasApplied ? <ApplyForm opportunity={opportunity} context={context} /> : null}
          {!data.currentUser ? <div className="apply-callout"><FileCheck2 size={21} /><div><b>Ready to take the next step?</b><p>Choose a demo profile before applying. Your application will be saved in this local demo.</p></div><Link className="button button-dark" href={`/login?next=/opportunities/${opportunity.id}`}>Choose a profile</Link></div> : null}
          {hasApplied ? <div className="status-panel"><Check size={19} /><div><b>You’ve applied to this opportunity.</b><p>Follow your application status from your dashboard.</p></div><Link className="text-link" href="/applications">Track application <ArrowRight size={15} /></Link></div> : null}
          {deadlinePassed ? <div className="flash-message flash-info"><Clock3 size={17} />The application deadline has passed. This listing remains visible for reference.</div> : null}
          {data.currentUser && !canApply ? <div className="flash-message flash-info"><CircleHelp size={17} />Application submission is available to student and job-seeker demo profiles.</div> : null}
        </article>
        <aside className="detail-sidebar">
          <div className="detail-side-card apply-side-card"><span className="eyebrow">COMPENSATION</span><strong>{formatCompensation(opportunity)}</strong><span className="side-divider" /><span className="eyebrow">LOCATION</span><strong>{opportunity.location}</strong><span className="side-divider" /><span className="eyebrow">EXPERIENCE</span><strong>{opportunity.experienceLevel.replace("-", " ")}</strong>{data.currentUser ? <button type="button" className={`button ${data.savedOpportunityIds.includes(opportunity.id) ? "button-light" : "button-dark"} full-width`} onClick={() => handleSave(opportunity, data, context)}><Bookmark size={16} />{data.savedOpportunityIds.includes(opportunity.id) ? "Saved" : "Save this opportunity"}</button> : null}<p className="disclaimer-small"><ShieldCheck size={14} />Fictional example listing. Verify details independently before acting.</p></div>
          {publisher ? <div className="detail-side-card publisher-card"><span className="eyebrow">THE PUBLISHER</span><div className="person-identity"><PersonAvatar person={publisher} /><span><b>{publisher.name}</b><small>{roleNames[publisher.role]} · demo profile</small></span></div><p>{publisher.headline}</p><Link className="text-link" href={`/people/${publisher.id}`}>View public profile <ArrowRight size={15} /></Link></div> : null}
        </aside>
      </div>
      {data.currentUser && data.currentUser.id !== opportunity.publisherId ? <div className="opportunity-safety-actions"><ReportContentForm targetType="opportunity" targetId={opportunity.id} context={context} /></div> : null}
      {related.length ? <section className="related-section"><SectionIntro eyebrow="Keep exploring" title="A few more possibilities" description="Related opportunities from this sample collection." /><div className="opportunity-grid">{related.map((item) => <OpportunityCard key={item.id} opportunity={item} saved={data.savedOpportunityIds.includes(item.id)} onSave={() => handleSave(item, data, context)} compact />)}</div></section> : null}
    </div>
  );
}

function ApplyForm({ opportunity, context }: { opportunity: Opportunity; context: RouteContext }) {
  const [coverNote, setCoverNote] = useState("");
  return <form className="apply-form" onSubmit={async (event) => {
    event.preventDefault();
    await context.performAction({ type: "apply", opportunityId: opportunity.id, coverNote });
  }}>
    <p className="eyebrow">YOUR NEXT STEP</p><h2>Send in your application</h2><p>Your demo application starts as “Submitted”. You can track updates from your application page.</p>
    <label>A short introduction <span className="optional-label">Optional</span><textarea value={coverNote} onChange={(event) => setCoverNote(event.target.value)} maxLength={2000} rows={4} placeholder="Share why this opportunity interests you." /></label>
    <div className="form-hint">Your message is visible to the listing publisher. Keep it professional and don?t share sensitive personal details.</div>
    <button className="button button-dark" disabled={context.busy} type="submit"><Send size={16} />Submit application</button>
  </form>;
}

function PeopleDirectory({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [skill, setSkill] = useState("");
  const [interest, setInterest] = useState("");
  const [location, setLocation] = useState("");
  const people = data.people.filter((person) => {
    if (person.id === data.currentUser?.id) return false;
    if (role && !person.roles.includes(role as Role)) return false;
    if (skill && !person.skills.some((item) => item.toLowerCase() === skill.toLowerCase())) return false;
    if (interest && !person.interests.some((item) => item.toLowerCase().includes(interest.toLowerCase()))) return false;
    if (location && !person.location.toLowerCase().includes(location.toLowerCase())) return false;
    const search = query.trim().toLowerCase();
    return !search || [person.name, person.headline, person.bio, person.skills.join(" "), person.interests.join(" "), person.location].join(" ").toLowerCase().includes(search);
  });
  const skillOptions = Array.from(new Set(data.people.flatMap((person) => person.skills))).sort();
  const clearFilters = () => { setQuery(""); setRole(""); setSkill(""); setInterest(""); setLocation(""); };
  return <div className="content-page">
    <PageHeading eyebrow="The people behind possibility" title="Find your people." description="Discover thoughtful builders, mentors, founders, and teams. Every profile here is fictional demo content." action={<span className="count-chip">{people.length} demo profiles</span>} />
    <label className="search-control people-search"><Search size={18} /><span className="sr-only">Search people</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, skills, or what they?re building" /></label>
    <div className="people-toolbar">
      <label>Role<select value={role} onChange={(event) => setRole(event.target.value)}><option value="">All roles</option>{Object.entries(roleNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Skill<select value={skill} onChange={(event) => setSkill(event.target.value)}><option value="">Any skill</option>{skillOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Interest<input value={interest} onChange={(event) => setInterest(event.target.value)} placeholder="e.g. climate" /></label>
      <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or region" /></label>
      <button type="button" className="text-button" onClick={clearFilters}>Clear filters</button>
    </div>
    <p className="results-summary"><strong>{people.length}</strong> people to meet · sample profiles, not verified identities</p>
    {people.length ? <div className="people-grid">{people.map((person) => <PersonCard key={person.id} person={person} data={data} context={context} />)}</div> : <EmptyState title="No profiles match these filters." body="Try a different search or clear your filters to meet more people." action={<button className="button button-light" type="button" onClick={clearFilters}>Clear filters</button>} />}
  </div>;
}

function PersonCard({ person, data, context }: { person: PublicUser; data: BootstrapData; context: RouteContext }) {
  const connection = data.connections.find((item) => item.otherPerson.id === person.id);
  const saved = data.savedProfileIds.includes(person.id);
  const [actionError, setActionError] = useState("");
  const handleConnect = async () => {
    setActionError("");
    if (!data.currentUser) { context.navigate("/login"); return; }
    if (connection?.status === "pending") {
      const action = connection.recipientId === data.currentUser.id ? "accept" : "cancel";
      void context.performAction({ type: "connection-update", connectionId: connection.id, action });
    } else if (connection?.status === "accepted") {
      try {
        await context.postJson("/api/actions", { type: "start-conversation", recipientId: person.id });
        context.navigate("/messages");
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "This conversation could not be opened.");
      }
    } else {
      void context.performAction({ type: "connection-request", recipientId: person.id });
    }
  };
  return <article className="person-card"><div className={`person-card-top tone-${person.role}`}><span className="person-role-tag">{person.roles.map((role) => roleNames[role]).join(" · ")}</span><PersonAvatar person={person} large /></div><div className="person-card-body"><Link href={`/people/${person.id}`}><h3>{person.name}</h3></Link><p className="person-headline">{person.headline}</p><span className="person-location"><MapPin size={14} />{person.location}</span><p className="person-bio">{person.bio}</p><div className="skill-list">{person.skills.slice(0, 3).map((item) => <span className="skill-pill" key={item}>{item}</span>)}</div><div className="person-card-actions"><button type="button" className={`button ${connection?.status === "accepted" ? "button-light" : "button-dark"} button-small`} onClick={handleConnect}>{connection?.status === "accepted" ? <><MessageCircle size={15} />Message</> : connection?.status === "pending" && connection.recipientId === data.currentUser?.id ? "Accept request" : connection?.status === "pending" ? "Cancel request" : <><Handshake size={15} />Connect</>}</button>{data.currentUser ? <button className={`icon-button save-button ${saved ? "is-saved" : ""}`} type="button" onClick={() => void context.performAction({ type: "save-profile", profileId: person.id, saved: !saved })} aria-label={saved ? `Unsave ${person.name}` : `Save ${person.name}`}><Bookmark size={16} /></button> : null}<Link className="text-link" href={`/people/${person.id}`}>Profile <ArrowRight size={14} /></Link></div>{actionError ? <p className="inline-action-error" role="alert">{actionError}</p> : null}</div></article>;
}

function PersonDetail({ id, data, context }: { id: string; data: BootstrapData; context: RouteContext }) {
  const person = data.people.find((item) => item.id === id);
  if (!person) return <InfoPage title="We couldn?t find that profile." description="This fictional profile may have been removed or isn?t available in the demo community." action={<Link className="button button-dark" href="/people">Meet the community <ArrowRight size={16} /></Link>} />;
  const canBook = person.roles.some((role) => role === "mentor" || role === "advisor");
  const isSelf = data.currentUser?.id === person.id;
  return <div className="content-page"><Link className="back-link" href="/people"><ArrowLeft size={16} /> Meet the community</Link><div className="profile-detail-card"><div className={`profile-detail-cover tone-${person.role}`}><PersonAvatar person={person} large /><span className="person-role-tag">{person.roles.map((role) => roleNames[role]).join(" · ")} · fictional demo profile</span></div><div className="profile-detail-body"><h1>{person.name}</h1><p className="person-headline">{person.headline}</p><span className="person-location"><MapPin size={14} />{person.location}</span><p className="profile-bio">{person.bio}</p><div className="detail-section"><p className="eyebrow">Skills</p><div className="skill-list skill-list-large">{person.skills.map((item) => <span className="skill-pill" key={item}>{item}</span>)}</div></div><div className="detail-section"><p className="eyebrow">Interests</p><div className="role-chips">{person.interests.map((item) => <span key={item}>{item}</span>)}</div></div>{!isSelf && data.currentUser ? <PersonCard person={person} data={data} context={context} /> : null}{!isSelf && canBook ? <SessionRequestForm provider={person} context={context} /> : null}{!isSelf && data.currentUser ? <div className="profile-safety-actions"><button type="button" className="text-button" onClick={() => void context.performAction({ type: "block-user", userId: person.id, blocked: !data.blockedProfileIds.includes(person.id) })}><Ban size={15} />{data.blockedProfileIds.includes(person.id) ? "Unblock profile" : "Block profile"}</button><ReportContentForm targetType="user" targetId={person.id} context={context} /></div> : null}</div></div></div>;
}

function SessionRequestForm({ provider, context }: { provider: PublicUser; context: RouteContext }) {
  const services = [
    ...(provider.roles.includes("mentor") ? [["mentorship", "Mentoring session"], ["cv-review", "CV review"]] : []),
    ...(provider.roles.includes("advisor") ? [["pitch-review", "Pitch deck review"], ["strategy", "Strategic guidance"]] : []),
  ] as Array<[string, string]>;
  return <form className="apply-form" onSubmit={(event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const localTime = String(form.get("scheduledFor") ?? "");
    const scheduledFor = localTime ? new Date(localTime).toISOString() : null;
    void context.performAction({
      type: "session-request",
      providerId: provider.id,
      serviceType: form.get("serviceType"),
      requestNote: form.get("requestNote"),
      scheduledFor,
    });
  }}>
    <p className="eyebrow">LEARN TOGETHER</p><h2>Request a session</h2><p>This sends a local demo request. No payment or calendar invite is created.</p>
    <label>What kind of help?<select name="serviceType" required>{services.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    <label>Propose a time <span className="optional-label">Optional</span><input type="datetime-local" name="scheduledFor" /></label>
    <label>What would you like to discuss?<textarea name="requestNote" rows={3} maxLength={500} placeholder="Share a little context." /></label>
    <button className="button button-dark" type="submit" disabled={context.busy}><CalendarDays size={16} />Send session request</button>
  </form>;
}

function ReportContentForm({ targetType, targetId, context }: { targetType: "user" | "opportunity"; targetId: string; context: RouteContext }) {
  return <details className="report-control"><summary><Flag size={15} />Report {targetType === "user" ? "profile" : "listing"}</summary><form className="form-stack" onSubmit={(event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void context.performAction({ type: "report-content", targetType, targetId, reason: form.get("reason"), details: form.get("details") });
    event.currentTarget.reset();
  }}>
    <label>Reason<select name="reason" required><option value="">Choose a reason</option><option>Misleading information</option><option>Spam or scam</option><option>Harassment or unsafe content</option><option>Other trust concern</option></select></label>
    <label>Details <span className="optional-label">Optional</span><textarea name="details" maxLength={500} rows={3} /></label>
    <button type="submit" className="button button-light button-small" disabled={context.busy}>Send private report</button>
  </form></details>;
}

function LoginPage({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const [roleFilter, setRoleFilter] = useState("");
  const demoPeople = data.people.filter((person) => !roleFilter || person.roles.includes(roleFilter as Role));
  return <div className="auth-page"><div className="auth-card"><div className="auth-icon"><Compass size={22} /></div><p className="eyebrow">WELCOME TO OPPORTUNITYBRIDGE</p><h1>Find your way in.</h1><p>Choose a sample profile to explore a different perspective. This local demo has no password-based login.</p>
    <label>Select a demo profile<select id="demo-persona" defaultValue="" onChange={(event) => setRoleFilter(event.target.value)}><option value="">All demo roles</option>{Object.entries(roleNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <div className="demo-profile-list">{demoPeople.map((person) => <button key={person.id} type="button" className={`demo-profile-choice ${data.currentUser?.id === person.id ? "is-current" : ""}`} onClick={() => void context.switchDemo(person.id)}><PersonAvatar person={person} /><span><b>{person.name}</b><small>{roleNames[person.role]} · demo profile</small></span><ArrowRight size={17} /></button>)}</div>
    <div className="form-hint"><ShieldCheck size={15} />The role switcher only selects fictional demo users. It cannot grant admin access.</div>
    <p className="auth-switch">New to the demo? <Link href="/register">Create a local demo profile</Link></p>
  </div><aside className="auth-aside"><span className="eyebrow">A NOTE ABOUT DEMO MODE</span><h2>All the features.<br />A little less ceremony.</h2><p>Switch roles freely to explore how the same connected community feels from a different point of view.</p><div className="auth-aside-points"><span><Check size={16} />No production account is created</span><span><Check size={16} />Changes persist in local demo data</span><span><Check size={16} />No email or third-party service required</span></div></aside></div>;
}

function RegisterPage({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const skills = String(form.get("skills") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    const roles = form.getAll("roles").map(String);
    try {
      await context.postJson("/api/register", {
        name: form.get("name"),
        email: form.get("email"),
        role: form.get("role"),
        roles,
        location: form.get("location"),
        skills,
      });
      context.navigate("/onboarding");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Your demo profile could not be created.");
      setSubmitting(false);
    }
  }
  return <div className="content-page narrow-page"><div className="auth-card register-card"><p className="eyebrow">MAKE A LITTLE ROOM FOR WHAT?S NEXT</p><h1>Create your demo profile.</h1><p>Start a local, fictional profile to try the product. This demo does not create a real-world account.</p>
    {error ? <FlashMessage flash={{ tone: "error", message: error }} /> : null}
    <form className="form-stack" onSubmit={submit}>
      <label>Your name<input name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="e.g. Aarav Sharma" /></label>
      <label>Email for this demo<input name="email" type="email" required maxLength={150} autoComplete="email" placeholder="you@example.com" /><small className="field-hint">Used only to identify your local demo profile; no email is sent.</small></label>
      <label>How do you see yourself here?<select name="role" required defaultValue="student">{Object.entries(roleNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <fieldset className="role-choice-set"><legend>Activate other roles too <span className="optional-label">Optional</span></legend><p className="field-hint">One account can take part in more than one way. You can change these later.</p>{Object.entries(roleNames).map(([value, label]) => <label className="checkbox-label" key={value}><input type="checkbox" name="roles" value={value} />{label}</label>)}</fieldset>
      <label>City or region<input name="location" required minLength={2} maxLength={100} placeholder="e.g. Pune, India" /></label>
      <label>Your skills <span className="optional-label">Optional · separate with commas</span><input name="skills" maxLength={300} placeholder="e.g. React, research, writing" /></label>
      <label className="checkbox-label"><input type="checkbox" required />I understand this creates fictional local demo data, not a production account.</label>
      <button className="button button-dark full-width" type="submit" disabled={submitting}>{submitting ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}Create demo profile</button>
    </form><p className="auth-switch">Already exploring? <Link href="/login">Choose an existing demo profile</Link></p><p className="field-hint">{data.people.length} fictional profiles are already available in demo sign-in.</p>
  </div></div>;
}

function ContactPage({ context }: { context: RouteContext }) {
  const [notice, setNotice] = useState<Flash>(null);
  const [sending, setSending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setSending(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const result = await context.postJson<{ message: string }>("/api/contact", Object.fromEntries(form.entries()));
      setNotice({ tone: "success", message: result.message });
      formElement.reset();
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Your message could not be saved." });
    } finally {
      setSending(false);
    }
  }
  return <div className="content-page"><PageHeading eyebrow="We?d love to hear from you" title="A small note can start a good conversation." description="Share feedback, a question, or an idea. In this demo your message is saved locally — no email is sent." /><div className="form-card contact-card">{notice ? <FlashMessage flash={notice} /> : null}<form className="form-stack" onSubmit={submit}><label>Your name<input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label><label>Email<input name="email" type="email" required maxLength={150} autoComplete="email" /></label><label>What is this about?<input name="topic" required minLength={2} maxLength={100} placeholder="A product idea, question, or feedback" /></label><label>Your message<textarea name="message" rows={5} required minLength={10} maxLength={2000} /></label><button className="button button-dark" type="submit" disabled={sending}>{sending ? "Saving…" : "Save message"} <ArrowRight size={16} /></button></form></div></div>;
}

function AboutPage() {
  return <div className="content-page"><section className="story-hero"><p className="eyebrow">A little more room to grow</p><h1>Where opportunity<br /><span>meets potential.</span></h1><p>There are so many people with something to offer — and so many possibilities waiting for the right introduction. We built OpportunityBridge to help them find each other.</p><Link className="button button-dark" href="/opportunities">Explore what?s possible <ArrowRight size={16} /></Link><div className="story-decoration story-decoration-one" /><div className="story-decoration story-decoration-two" /></section><section className="section"><SectionIntro eyebrow="What we believe" title="Good things grow when you grow together." description="A professional community should feel as generous as it is useful." /><div className="belief-grid">{[["Make discovery feel human", "Find a person, a project, or a role that fits the story you are building."], ["Keep the next step clear", "A transparent path from first look to application, introduction, and follow-up."], ["Build trust through honesty", "A product that tells you what is demo, what is configured, and what happens next."]].map(([title, body]) => <article className="belief-card" key={title}><span><Sparkles size={18} /></span><h3>{title}</h3><p>{body}</p></article>)}</div></section><section className="disclosure-card"><ShieldCheck size={22} /><div><b>About this product demo</b><p>All people, organizations, opportunities, testimonials, and activity in this application are fictional sample content. The local demo helps you explore product workflows; it is not a live hiring, investment, or messaging service.</p></div></section></div>;
}

function HowItWorksPage() {
  const steps = [
    ["01", "Start with your story", "Pick a demo profile or create your own. Add interests and skills so the experience can begin to feel like yours.", "Your profile is a starting point, not a score."],
    ["02", "Discover with a little context", "Search opportunities and people by the things that matter to you: skills, interests, location, and where you are in your journey.", "Recommendation scores are transparent estimates."],
    ["03", "Reach out when it feels right", "Save a listing, apply with a short note, or request a connection. Each action gives you a clear confirmation.", "You stay in control of what you share."],
    ["04", "Keep the thread going", "Follow application updates, respond to a connection request, and continue a conversation with people you are connected to.", "Messages are persisted in this local demo."],
  ];
  return <div className="content-page"><PageHeading eyebrow="A guided walkthrough" title="A good next step, one small move at a time." description="Here?s how OpportunityBridge makes discovery, introductions, and follow-through feel like one connected journey." /><div className="walkthrough-list">{steps.map(([number, title, body, note]) => <article className="walkthrough-step" key={number}><span className="walkthrough-number">{number}</span><div><h2>{title}</h2><p>{body}</p><small>{note}</small></div></article>)}</div><div className="next-step-callout"><div><Sparkles size={20} /><h2>Want to take it for a spin?</h2><p>Explore as a guest, or switch between demo roles to see the journey from each side.</p></div><Link className="button button-dark" href="/login">Choose a demo profile <ArrowRight size={16} /></Link></div></div>;
}

function OnboardingPage({ data }: { data: BootstrapData }) {
  const user = data.currentUser;
  if (!user) return <InfoPage title="Start with a demo profile." description="Choose a role and tell OpportunityBridge a little about yourself. Your profile will be local and fictional." action={<Link className="button button-dark" href="/login">Choose a profile <ArrowRight size={16} /></Link>} />;
  return <div className="content-page narrow-page"><div className="onboarding-card"><span className="step-number">YOUR FIRST STEP</span><p className="eyebrow">WELCOME, {user.name.split(" ")[0].toUpperCase()}</p><h1>Let?s make this feel a little more like you.</h1><p>You?re exploring as a <strong>{roleNames[user.role]}</strong>. Your sample profile is ready. Add or update your details whenever you like.</p><div className="onboarding-progress"><span style={{ width: `${data.metrics.profileCompletion}%` }} /><b>{data.metrics.profileCompletion}%</b></div><p className="field-hint">Profile details inform the explainable recommendations shown in your discovery feed.</p><div className="onboarding-actions"><Link className="button button-dark" href="/profile">Review your profile <ArrowRight size={16} /></Link><Link className="button button-light" href="/dashboard">Go to your dashboard</Link></div></div></div>;
}

function DashboardPage({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const user = data.currentUser;
  const [activeRole, setActiveRole] = useState<Role>(user?.role ?? "student");
  if (!user) return <InfoPage title="Choose a demo profile to begin." description="Your dashboard follows your role and activity, so pick a profile before you settle in." action={<Link className="button button-dark" href="/login">Choose a profile <ArrowRight size={16} /></Link>} />;

  const greeting = user.name.split(" ")[0];
  const dashboardTitles: Record<Role, string> = {
    student: "A small step can open a big door.",
    "job-seeker": "Your next role is closer than it feels.",
    founder: "Build something worth joining.",
    investor: "Meet the founders shaping what's next.",
    mentor: "Your experience can open a door.",
    advisor: "Good advice starts with listening.",
    recruiter: "Find people who make the work better.",
  };
  const title = dashboardTitles[activeRole];
  const ownedOpportunities = data.opportunities.filter((item) => item.publisherId === user.id);
  const publisherApplications = data.applications.filter((item) => item.opportunity?.publisherId === user.id);
  const ownApplications = data.applications.filter((item) => item.applicantId === user.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const sessions = data.mentoringSessions.filter((item) => item.providerId === user.id);
  const activeListings = ownedOpportunities.filter((item) => item.status === "published");
  const investorStartups = [...data.startups].sort((first, second) => {
    const interestScore = (industry: string) => user.interests.filter((interest) =>
      industry.toLowerCase().includes(interest.toLowerCase()) || interest.toLowerCase().includes(industry.toLowerCase()),
    ).length;
    return interestScore(second.industry) - interestScore(first.industry);
  });
  const matching = recommendOpportunities(
    findStoredUser(user, data.people),
    data.opportunities.filter((item) => item.status === "published"),
    new Date(),
  ).slice(0, 3);
  const metricCards: Array<{ label: string; value: number | string; href: string; detail: string }> = activeRole === "founder" || activeRole === "recruiter"
    ? [
        { label: "Live listings", value: activeListings.length, href: "/manage-opportunities", detail: "Your published opportunities" },
        { label: "Applicants", value: publisherApplications.length, href: "/manage-applicants", detail: "Across your listings" },
        { label: "Need a response", value: publisherApplications.filter((item) => item.status === "submitted").length, href: "/manage-applicants", detail: "New submissions" },
        { label: "Profile completeness", value: `${data.metrics.profileCompletion}%`, href: "/profile", detail: "Make your organization easier to find" },
      ]
    : activeRole === "investor"
      ? [
          { label: "Startups to explore", value: data.startups.length, href: "/startups", detail: "Fictional profiles in this demo" },
          { label: "Funding listings", value: data.opportunities.filter((item) => item.type === "startup-funding" && item.status === "published").length, href: "/opportunities", detail: "Published demo opportunities" },
          { label: "Connections", value: data.metrics.connections, href: "/connections", detail: "People in your circle" },
          { label: "Profile completeness", value: `${data.metrics.profileCompletion}%`, href: "/profile", detail: "Help founders understand your focus" },
        ]
      : activeRole === "mentor" || activeRole === "advisor"
        ? [
            { label: "Requests to review", value: sessions.filter((item) => item.status === "requested").length, href: "/sessions", detail: "Waiting for your response" },
            { label: "Accepted sessions", value: sessions.filter((item) => item.status === "accepted").length, href: "/sessions", detail: "In progress or to schedule" },
            { label: "Completed", value: sessions.filter((item) => item.status === "completed").length, href: "/sessions", detail: "Guidance sessions completed" },
            { label: "Profile completeness", value: `${data.metrics.profileCompletion}%`, href: "/profile", detail: "Share the help you can offer" },
          ]
        : [
            { label: "Applications", value: ownApplications.length, href: "/applications", detail: "Your current journey" },
            { label: "In progress", value: ownApplications.filter((item) => ["submitted", "reviewing", "shortlisted", "interview"].includes(item.status)).length, href: "/applications", detail: "Submitted through accepted" },
            { label: "Saved opportunities", value: data.metrics.savedOpportunities, href: "/saved", detail: "Worth another look" },
            { label: "Profile completeness", value: `${data.metrics.profileCompletion}%`, href: "/profile", detail: "Improve recommendations" },
          ];
  const suggestedRoles: Role[] = activeRole === "founder"
    ? ["investor", "advisor", "mentor"]
    : activeRole === "investor"
      ? ["founder", "advisor"]
      : ["mentor", "founder", "recruiter"];
  const featuredPeople = data.people.filter((person) => person.id !== user.id && person.roles.some((role) => suggestedRoles.includes(role))).slice(0, 4);

  return <div className="content-page dashboard-page">
    <div className="dashboard-welcome">
      <div><p className="eyebrow">{roleNames[activeRole].toUpperCase()} WORKSPACE · LOCAL DEMO</p><h1>Hi, {greeting}.<br /><span>{title}</span></h1><p>Your overview is built from the activity attached to this demo profile.</p></div>
      <div className="welcome-sparkle"><Sparkles size={31} /></div>
    </div>
    {user.roles.length > 1 ? <div className="dashboard-role-picker" role="tablist" aria-label="Choose a dashboard role">
      <span>VIEW AS</span>
      {user.roles.map((role) => <button key={role} type="button" role="tab" aria-selected={activeRole === role} className={activeRole === role ? "active" : ""} onClick={() => setActiveRole(role)}>{roleNames[role]}</button>)}
    </div> : null}
    <div className="dashboard-metrics">{metricCards.map(({ label, value, href, detail }) => <Link className="metric-card" key={label} href={href}><span>{label}</span><strong>{value}</strong><small>{detail} <ArrowUpRight size={13} /></small></Link>)}</div>
    {(activeRole === "founder" || activeRole === "recruiter")
      ? <PublisherDashboard applications={publisherApplications} opportunities={ownedOpportunities} />
      : activeRole === "investor"
        ? <InvestorDashboard
            startups={investorStartups}
            fundingOpportunities={data.opportunities.filter((item) => item.type === "startup-funding" && item.status === "published")}
          />
        : activeRole === "mentor" || activeRole === "advisor"
          ? <GuidanceDashboard sessions={sessions} context={context} />
          : <ApplicantDashboard applications={ownApplications} recommendations={matching} data={data} context={context} />}
    <div className="dashboard-grid dashboard-secondary-grid">
      <aside className="dashboard-panel people-panel"><div className="panel-heading"><div><p className="eyebrow">PEOPLE FOR YOUR {activeRole === "investor" ? "NETWORK" : "NEXT STEP"}</p><h2>Useful introductions.</h2></div><Link href="/people" className="icon-button" aria-label="Browse all people"><ArrowRight size={16} /></Link></div>
        {featuredPeople.length ? <div className="suggested-people">{featuredPeople.map((person) => <Link className="suggested-person" key={person.id} href={`/people/${person.id}`}><PersonAvatar person={person} /><span><b>{person.name}</b><small>{roleNames[person.role]} · demo profile</small></span><ArrowUpRight size={15} /></Link>)}</div> : <p className="quiet-empty">Explore the community to discover people for your next step.</p>}
        <Link href="/people" className="panel-footer-link">Explore the community <ArrowRight size={14} /></Link>
      </aside>
      <div className="dashboard-panel dashboard-profile-panel"><div className="profile-progress-icon"><BadgeCheck size={20} /></div><p className="eyebrow">PROFILE QUALITY</p><h2>{data.metrics.profileCompletion}% complete</h2><p>Adding clear skills, interests, and a short introduction helps people and recommendations understand your goals.</p><div className="dashboard-progress-track"><span style={{ width: `${data.metrics.profileCompletion}%` }} /></div><Link className="button button-light button-small" href="/profile">Improve profile <ArrowRight size={14} /></Link></div>
    </div>
    <div className="demo-reminder dashboard-demo-reminder"><ShieldCheck size={19} /><div><b>Local demo data</b><p>People, startups, listings, applications, and metrics are fictional. Activity you create is stored in this local demo.</p></div></div>
  </div>;
}

function ApplicantDashboard({
  applications,
  recommendations,
  data,
  context,
}: {
  applications: BootstrapData["applications"];
  recommendations: ReturnType<typeof recommendOpportunities>;
  data: BootstrapData;
  context: RouteContext;
}) {
  const stages: Array<{ status: ApplicationStatus; label: string }> = [
    { status: "submitted", label: "Submitted" },
    { status: "reviewing", label: "In review" },
    { status: "shortlisted", label: "Shortlisted" },
    { status: "interview", label: "Interview" },
    { status: "accepted", label: "Accepted" },
  ];
  const maximum = Math.max(1, ...stages.map(({ status }) => applications.filter((item) => item.status === status).length));
  return <div className="dashboard-grid dashboard-primary-grid">
    <section className="dashboard-panel">
      <div className="panel-heading"><div><p className="eyebrow">APPLICATION JOURNEY</p><h2>See where things stand.</h2></div><Link className="text-link" href="/applications">All applications <ArrowRight size={14} /></Link></div>
      {applications.length ? <>
        <div className="dashboard-stage-list">{stages.map(({ status, label }) => {
          const count = applications.filter((item) => item.status === status).length;
          return <div className="dashboard-stage-row" key={status}><span>{label}</span><div className="dashboard-stage-track"><span style={{ width: `${Math.max(count ? 8 : 0, (count / maximum) * 100)}%` }} /></div><b>{count}</b></div>;
        })}</div>
        <div className="dashboard-list dashboard-recent-applications">{applications.slice(0, 3).map((application) => <ApplicationRow key={application.id} application={application} />)}</div>
      </> : <EmptyState title="Your application journey starts here." body="Browse the demo opportunities and apply to a role that matches your interests." action={<Link className="button button-dark" href="/opportunities">Explore opportunities <ArrowRight size={15} /></Link>} />}
    </section>
    <section className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">RECOMMENDED FOR YOU</p><h2>Good next opportunities.</h2></div><Link className="text-link" href="/recommendations">See matches <ArrowRight size={14} /></Link></div>
      {recommendations.length ? <div className="dashboard-opportunity-list">{recommendations.slice(0, 3).map(({ opportunity, score }) => <div className="dashboard-opportunity-row" key={opportunity.id}><div><span className="score-label"><Sparkles size={12} />{score}% match</span><Link href={`/opportunities/${opportunity.id}`}><b>{opportunity.title}</b></Link><small>{opportunity.organization} · deadline {new Date(opportunity.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small></div><button className={`icon-button save-button ${data.savedOpportunityIds.includes(opportunity.id) ? "is-saved" : ""}`} type="button" onClick={() => handleSave(opportunity, data, context)} aria-label={data.savedOpportunityIds.includes(opportunity.id) ? `Remove ${opportunity.title} from saved` : `Save ${opportunity.title}`}>{data.savedOpportunityIds.includes(opportunity.id) ? <Check size={16} /> : <Bookmark size={16} />}</button></div>)}</div> : <p className="quiet-empty">Update your profile interests and skills to get more relevant suggestions.</p>}
    </section>
  </div>;
}

function PublisherDashboard({
  applications,
  opportunities,
}: {
  applications: BootstrapData["applications"];
  opportunities: Opportunity[];
}) {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const statuses: ApplicationStatus[] = ["submitted", "reviewing", "shortlisted", "interview", "accepted", "rejected"];
  const filteredApplications = applications.filter((application) => statusFilter === "all" || application.status === statusFilter).slice(0, 5);
  return <div className="dashboard-grid dashboard-primary-grid">
    <section className="dashboard-panel">
      <div className="panel-heading"><div><p className="eyebrow">HIRING & OPPORTUNITY PIPELINE</p><h2>Keep every listing moving.</h2></div><Link className="text-link" href="/manage-applicants">Open applicant inbox <ArrowRight size={14} /></Link></div>
      <div className="dashboard-filter-row" aria-label="Filter applications by status">
        <button type="button" className={statusFilter === "all" ? "active" : ""} onClick={() => setStatusFilter("all")}>All ({applications.length})</button>
        {statuses.slice(0, 4).map((status) => <button type="button" key={status} className={statusFilter === status ? "active" : ""} onClick={() => setStatusFilter(status)}>{statusLabels[status]} ({applications.filter((item) => item.status === status).length})</button>)}
      </div>
      {filteredApplications.length ? <div className="dashboard-list">{filteredApplications.map((application) => <ApplicationRow key={application.id} application={application} />)}</div> : <EmptyState title={applications.length ? "No applicants at this stage." : "Your applicant pipeline is ready."} body={applications.length ? "Choose another status to see other applicants." : "Publish a listing to start receiving demo applications."} action={<Link className="button button-dark" href={opportunities.length ? "/manage-opportunities" : "/publish"}>{opportunities.length ? "Manage listings" : "Publish a listing"} <ArrowRight size={15} /></Link>} />}
    </section>
    <section className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">LISTING HEALTH</p><h2>Your opportunities.</h2></div><Link className="text-link" href="/manage-opportunities">Manage <ArrowRight size={14} /></Link></div>
      {opportunities.length ? <div className="dashboard-listing-health">{opportunities.slice(0, 5).map((opportunity) => {
        const count = applications.filter((application) => application.opportunityId === opportunity.id).length;
        return <article className="dashboard-listing-row" key={opportunity.id}><div className="dashboard-listing-top"><Link href={`/opportunities/${opportunity.id}`}><b>{opportunity.title}</b></Link><span className={`listing-status listing-${opportunity.status}`}>{opportunity.status}</span></div><div className="dashboard-listing-bottom"><span>{count} application{count === 1 ? "" : "s"}</span><span>Deadline {new Date(opportunity.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div><div className="dashboard-progress-track"><span style={{ width: `${Math.min(100, count * 15)}%` }} /></div></article>;
      })}</div> : <p className="quiet-empty">Publish your first opportunity to build an applicant pipeline.</p>}
      <Link className="button button-light button-small dashboard-panel-action" href="/publish"><Plus size={14} />Create a listing</Link>
    </section>
  </div>;
}

function InvestorDashboard({
  startups,
  fundingOpportunities,
}: {
  startups: BootstrapData["startups"];
  fundingOpportunities: Opportunity[];
}) {
  return <div className="dashboard-grid dashboard-primary-grid">
    <section className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">FOUNDER DISCOVERY</p><h2>Start with the teams behind the ideas.</h2></div><Link className="text-link" href="/startups">Browse startups <ArrowRight size={14} /></Link></div>
      {startups.length ? <div className="investor-startup-list">{startups.slice(0, 4).map((startup) => <article className="investor-startup-card" key={startup.id}><div className="investor-startup-heading"><span className="startup-stage">{startup.stage.replace("-", " ")}</span><span className="demo-pill">DEMO</span></div><h3>{startup.name}</h3><p>{startup.summary}</p><div className="investor-startup-meta"><span>{startup.industry}</span><span>{startup.fundingAskInr === null ? "Funding ask not listed" : `Ask: ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(startup.fundingAskInr)}`}</span></div><div className="investor-startup-founder"><PersonAvatar person={startup.founder} /><span><b>{startup.founder.name}</b><small>Founder · fictional profile</small></span><Link className="text-link" href={`/people/${startup.founder.id}`}>Connect <ArrowRight size={13} /></Link></div></article>)}</div> : <p className="quiet-empty">There are no startup profiles to show in this demo.</p>}
    </section>
    <section className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">FUNDING OPPORTUNITIES</p><h2>Open opportunities.</h2></div><Link className="text-link" href="/opportunities">Explore <ArrowRight size={14} /></Link></div>
      {fundingOpportunities.length ? <div className="dashboard-opportunity-list">{fundingOpportunities.slice(0, 4).map((opportunity) => <div className="dashboard-opportunity-row" key={opportunity.id}><div><span className="demo-pill">DEMO LISTING</span><Link href={`/opportunities/${opportunity.id}`}><b>{opportunity.title}</b></Link><small>{opportunity.organization} · deadline {new Date(opportunity.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small></div><ArrowUpRight size={15} /></div>)}</div> : <p className="quiet-empty">No funding listings are currently published in this demo.</p>}
      <p className="dashboard-context-note">Startup profiles and funding listings are fictional sample records. Review the founder profile and opportunity details before reaching out.</p>
      <Link className="button button-dark button-small dashboard-panel-action" href="/startups">Discover startup profiles <ArrowRight size={14} /></Link>
    </section>
  </div>;
}

function GuidanceDashboard({ sessions, context }: { sessions: BootstrapData["mentoringSessions"]; context: RouteContext }) {
  const requests = [...sessions].filter((session) => session.status === "requested").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const upcoming = [...sessions].filter((session) => session.status === "accepted").sort((a, b) => {
    if (!a.scheduledFor) return 1;
    if (!b.scheduledFor) return -1;
    return a.scheduledFor.localeCompare(b.scheduledFor);
  });
  return <div className="dashboard-grid dashboard-primary-grid">
    <section className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">GUIDANCE INBOX</p><h2>Requests waiting for you.</h2></div><Link className="text-link" href="/sessions">All sessions <ArrowRight size={14} /></Link></div>
      {requests.length ? <div className="dashboard-session-list">{requests.slice(0, 4).map((session) => <article className="dashboard-session-row" key={session.id}><PersonAvatar person={session.otherPerson} /><div><b>{session.serviceType.replaceAll("-", " ")}</b><span>From {session.otherPerson.name}</span><small>{session.requestNote || "No additional note"} · requested {new Date(session.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small></div><div className="dashboard-session-actions"><button type="button" className="button button-dark button-small" disabled={context.busy} onClick={() => void context.performAction({ type: "session-update", sessionId: session.id, action: "accept" })}>Accept</button><Link className="text-link" href="/sessions">Review</Link></div></article>)}</div> : <EmptyState title="Your request inbox is clear." body="When someone requests a mentoring or advisory session, it will appear here." action={<Link className="button button-light" href="/people">View your public profile <ArrowRight size={15} /></Link>} />}
    </section>
    <section className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">ACCEPTED SESSIONS</p><h2>Plan the next conversation.</h2></div></div>
      {upcoming.length ? <div className="dashboard-session-list">{upcoming.slice(0, 4).map((session) => <div className="dashboard-upcoming-row" key={session.id}><span className="session-date-mark"><CalendarDays size={17} /></span><div><b>{session.otherPerson.name}</b><span>{session.serviceType.replaceAll("-", " ")}</span><small>{session.scheduledFor ? new Date(session.scheduledFor).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Time to be agreed directly"}</small></div><span className="listing-status listing-accepted">accepted</span></div>)}</div> : <p className="quiet-empty">Accepted sessions and agreed times will appear here. No calendar invite is sent by this local demo.</p>}
      <Link className="button button-light button-small dashboard-panel-action" href="/sessions">Manage sessions <ArrowRight size={14} /></Link>
    </section>
  </div>;
}

function ProfilePage({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const user = data.currentUser;
  if (!user) return <InfoPage title="Your profile lives with your demo session." description="Choose a demo profile to view and edit its public details." action={<Link className="button button-dark" href="/login">Choose a demo profile <ArrowRight size={16} /></Link>} />;
  return <div className="content-page narrow-page"><PageHeading eyebrow="Your story, your way" title="Your profile." description="A little context helps people understand what you want to build and what you can bring." /><div className="profile-editor-card"><div className="profile-editor-header"><PersonAvatar person={user} large /><div><span className="demo-pill">DEMO PROFILE</span><h2>{user.name}</h2><p>{user.roles.map((role) => roleNames[role]).join(" · ")} · visible to the demo community</p></div><span className="profile-completion-tag">{data.metrics.profileCompletion}% complete</span></div><form className="form-stack" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const tags = (name: string) => String(form.get(name) ?? "").split(",").map((item) => item.trim()).filter(Boolean); void context.performAction({ type: "update-profile", headline: form.get("headline"), bio: form.get("bio"), location: form.get("location"), skills: tags("skills"), interests: tags("interests"), remotePreference: form.get("remotePreference"), roles: form.getAll("roles").map(String) }); }}>
    <label>Headline<input name="headline" defaultValue={user.headline} maxLength={140} required /></label><label>About you<textarea name="bio" rows={4} defaultValue={user.bio} maxLength={500} /></label><label>Location<input name="location" defaultValue={user.location} maxLength={100} required /></label><label>Skills <span className="optional-label">Separate with commas</span><input name="skills" defaultValue={user.skills.join(", ")} maxLength={300} /></label><label>Interests <span className="optional-label">Separate with commas</span><input name="interests" defaultValue={user.interests.join(", ")} maxLength={300} /></label><label>Location preference<select name="remotePreference" defaultValue={user.remotePreference}><option value="any">Remote or nearby</option><option value="remote">Remote</option><option value="onsite">On-site</option></select></label><fieldset className="role-choice-set"><legend>Roles on your account</legend><p className="field-hint">Permissions use all selected roles. Keep at least one active role.</p>{Object.entries(roleNames).map(([value, label]) => <label className="checkbox-label" key={value}><input type="checkbox" name="roles" value={value} defaultChecked={user.roles.includes(value as Role)} />{label}</label>)}</fieldset><div className="form-hint"><ShieldCheck size={15} />Email, private applicant notes, and admin tools are never part of a public profile.</div><button className="button button-dark" type="submit" disabled={context.busy}>Save profile <Check size={16} /></button>
  </form></div></div>;
}

function SettingsPage({ data, context }: { data: BootstrapData; context: RouteContext }) {
  return <div className="content-page"><PageHeading eyebrow="Your preferences" title="A space that feels like yours." description="This demo stores your activity in a local file on this server. No email, calendar, or third-party integration is configured." /><div className="settings-grid"><section className="settings-card"><span className="settings-icon"><Users size={19} /></span><h2>Explore a different point of view</h2><p>Choose another fictional profile to see a different role?s dashboard. This never grants administrator access.</p><label>Demo persona<select value={data.currentUser?.id ?? ""} onChange={(event) => void context.switchDemo(event.target.value)}>{data.people.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.roles.map((role) => roleNames[role]).join(", ")}</option>)}</select></label></section><section className="settings-card"><span className="settings-icon"><ShieldCheck size={19} /></span><h2>Privacy & data</h2><ul className="privacy-list"><li><Check size={15} />Demo records are labeled and fictional.</li><li><Check size={15} />Passwords are not collected in demo login.</li><li><Check size={15} />Conversations are limited to participants.</li><li><Check size={15} />Reports are private to the reporter and admins.</li></ul></section><section className="settings-card"><span className="settings-icon"><CalendarDays size={19} /></span><h2>Mentoring sessions</h2><p>Review your private mentoring, CV review, pitch review, and advisory session requests.</p><Link className="text-link" href="/sessions">Open your sessions <ArrowRight size={15} /></Link></section><section className="settings-card"><span className="settings-icon"><Ban size={19} /></span><h2>Blocked profiles</h2>{data.blockedProfiles.length ? <ul className="blocked-profile-list">{data.blockedProfiles.map((person) => <li key={person.id}><span>{person.name}</span><button type="button" className="text-button" onClick={() => void context.performAction({ type: "block-user", userId: person.id, blocked: false })}>Unblock</button></li>)}</ul> : <p>You have not blocked any demo profiles.</p>}</section><section className="settings-card"><span className="settings-icon"><Bell size={19} /></span><h2>Notifications</h2><p>{data.metrics.unreadNotifications} unread notification{data.metrics.unreadNotifications === 1 ? "" : "s"} are attached to this demo profile.</p><Link className="text-link" href="/notifications">Review notification center <ArrowRight size={15} /></Link></section><section className="settings-card"><span className="settings-icon"><CircleHelp size={19} /></span><h2>Reset demo activity</h2><p>To restore the original sample data, stop the dev server and remove <code>.data/opportunitybridge.json</code>. The app seeds a fresh copy next time it starts.</p><p className="field-hint">Do not use the local JSON store as a multi-user production database.</p></section></div></div>;
}

function NotificationsPage({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const notifications = [...data.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <div className="content-page"><PageHeading eyebrow="A note from your network" title="Your notifications." description="Application updates, new connections, and messages for this demo profile." action={<span className="count-chip">{data.metrics.unreadNotifications} unread</span>} />{notifications.length ? <div className="notification-list">{notifications.map((notification) => <article className={`notification-item ${notification.readAt ? "" : "notification-unread"}`} key={notification.id}><span className="notification-icon">{notification.type === "message" ? <MessageCircle size={17} /> : notification.type === "connection" ? <Handshake size={17} /> : notification.type === "application" ? <FileCheck2 size={17} /> : <Sparkles size={17} />}</span><div className="notification-copy"><b>{notification.title}</b><p>{notification.body}</p><small>{new Date(notification.createdAt).toLocaleString("en-IN")} · demo notification</small></div><div className="notification-actions"><Link className="text-link" href={notification.href}>Open <ArrowRight size={14} /></Link>{!notification.readAt ? <button className="text-button" type="button" onClick={() => void context.performAction({ type: "mark-notification-read", notificationId: notification.id })}>Mark read</button> : <span className="read-label">Read</span>}</div></article>)}</div> : <EmptyState title="Nothing new just yet." body="Application and connection updates for this demo profile will appear here." action={<Link className="button button-light" href="/people">Meet people <ArrowRight size={15} /></Link>} />}</div>;
}

function ConnectionsPage({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const user = data.currentUser;
  const received = data.connections.filter((connection) => connection.status === "pending" && connection.recipientId === user?.id);
  const sent = data.connections.filter((connection) => connection.status === "pending" && connection.requesterId === user?.id);
  const connected = data.connections.filter((connection) => connection.status === "accepted");
  const act = (connectionId: string, action: "accept" | "decline" | "cancel" | "remove") => void context.performAction({ type: "connection-update", connectionId, action });
  return <div className="content-page"><PageHeading eyebrow="Keep good people close" title="Your connections." description="Connection requests and established relationships for your fictional demo profile." action={<Link className="button button-dark button-small" href="/people">Find people <Users size={15} /></Link>} />
    <div className="connection-sections"><section className="connection-section"><div className="panel-heading"><div><p className="eyebrow">REQUESTS FOR YOU</p><h2>Waiting for your reply <span className="count-chip">{received.length}</span></h2></div></div>{received.length ? received.map((item) => <ConnectionRow key={item.id} connection={item} onAccept={() => act(item.id, "accept")} onDecline={() => act(item.id, "decline")} />) : <p className="quiet-empty">No new requests. New introductions will appear here.</p>}</section><section className="connection-section"><div className="panel-heading"><div><p className="eyebrow">YOU REACHED OUT</p><h2>Requests you?ve sent <span className="count-chip">{sent.length}</span></h2></div></div>{sent.length ? sent.map((item) => <ConnectionRow key={item.id} connection={item} onCancel={() => act(item.id, "cancel")} />) : <p className="quiet-empty">No connection requests are waiting on a reply.</p>}</section><section className="connection-section"><div className="panel-heading"><div><p className="eyebrow">YOUR CIRCLE</p><h2>People you?re connected with <span className="count-chip">{connected.length}</span></h2></div></div>{connected.length ? connected.map((item) => <ConnectionRow key={item.id} connection={item} onRemove={() => act(item.id, "remove")} />) : <EmptyState title="Your circle is just getting started." body="Send a thoughtful connection request to start building it." action={<Link className="button button-light" href="/people">Explore people <ArrowRight size={15} /></Link>} />}</section></div>
  </div>;
}

function ConnectionRow({
  connection,
  onAccept,
  onDecline,
  onCancel,
  onRemove,
}: {
  connection: BootstrapData["connections"][number];
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  onRemove?: () => void;
}) {
  return <article className="connection-row"><PersonAvatar person={connection.otherPerson} /><div className="connection-row-person"><Link href={`/people/${connection.otherPerson.id}`}><b>{connection.otherPerson.name}</b></Link><span>{connection.otherPerson.headline}</span><small>{roleNames[connection.otherPerson.role]} · demo profile</small></div><div className="connection-row-actions">{onAccept ? <button type="button" className="button button-dark button-small" onClick={onAccept}>Accept</button> : null}{onDecline ? <button type="button" className="button button-light button-small" onClick={onDecline}>Decline</button> : null}{onCancel ? <button type="button" className="button button-light button-small" onClick={onCancel}>Cancel request</button> : null}{onRemove ? <><Link className="button button-light button-small" href="/messages">Message</Link><button type="button" className="text-button" onClick={onRemove}>Remove</button></> : null}</div></article>;
}

function MessagesPage({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const conversations = data.conversations;
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const selected = conversations.find((item) => item.id === selectedId) ?? conversations[0];
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !body.trim()) return;
    setError("");
    try {
      await context.postJson("/api/actions", { type: "send-message", conversationId: selected.id, body: body.trim() });
      setBody("");
      await context.refreshData();
      window.location.reload();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "The message could not be saved.");
    }
  }
  return <div className="content-page"><PageHeading eyebrow="Good conversations keep going" title="Your messages." description="Messages are stored locally for this demo and are only available to the two conversation participants." />
    <div className="inbox-layout"><aside className="conversation-list"><div className="conversation-list-heading"><b>INBOX</b><span>{conversations.length}</span></div>{conversations.length ? conversations.map((conversation) => <button type="button" className={`conversation-choice ${conversation.id === selected?.id ? "conversation-selected" : ""}`} key={conversation.id} onClick={() => { setSelectedId(conversation.id); void context.performAction({ type: "mark-conversation-read", conversationId: conversation.id }); }}><PersonAvatar person={conversation.otherPerson} /><span><b>{conversation.otherPerson.name}</b><small>{conversation.messages.at(-1)?.body ?? "Your conversation is ready."}</small></span></button>) : <p className="quiet-empty">No conversations yet. Connect with someone you know from this community first.</p>}</aside>
      {selected ? <section className="conversation-view"><header className="conversation-header"><PersonAvatar person={selected.otherPerson} /><div><b>{selected.otherPerson.name}</b><small>{roleNames[selected.otherPerson.role]} · demo profile</small></div><Link className="text-link" href={`/people/${selected.otherPerson.id}`}>Profile <ArrowUpRight size={14} /></Link></header><div className="message-thread" aria-live="polite">{selected.messages.map((message) => <div className={`message-bubble ${message.senderId === data.currentUser?.id ? "message-own" : ""}`} key={message.id}><p>{message.body}</p><small>{message.senderId === data.currentUser?.id ? "You" : selected.otherPerson.name.split(" ")[0]} · {new Date(message.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></div>)}</div>{error ? <FlashMessage flash={{ tone: "error", message: error }} /> : null}<form className="message-composer" onSubmit={send}><label className="sr-only" htmlFor="message-body">Write a message</label><textarea id="message-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={2} placeholder="Write a kind, thoughtful note…" required /><button className="button button-dark" type="submit" disabled={!body.trim()}>Send <Send size={16} /></button><small>Keep personal or sensitive information out of demo conversations.</small></form></section> : <div className="conversation-empty"><MessageCircle size={24} /><h3>A good conversation can start here.</h3><p>Send a connection request first. Once accepted, you?ll be able to exchange messages.</p><Link className="button button-light" href="/people">Meet people <ArrowRight size={15} /></Link></div>}
    </div>
  </div>;
}

function SavedPage({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const opportunities = data.opportunities.filter((opportunity) => data.savedOpportunityIds.includes(opportunity.id));
  const profiles = data.people.filter((person) => data.savedProfileIds.includes(person.id));
  return <div className="content-page"><PageHeading eyebrow="A little list of possibilities" title="Saved for later." description="Opportunities and people you want to return to. Your saved items persist in the local demo." />
    <section className="saved-section"><div className="panel-heading"><div><p className="eyebrow">OPPORTUNITIES</p><h2>{opportunities.length} saved listing{opportunities.length === 1 ? "" : "s"}</h2></div><Link className="text-link" href="/opportunities">Find more <ArrowRight size={15} /></Link></div>{opportunities.length ? <div className="opportunity-grid">{opportunities.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} saved onSave={() => handleSave(opportunity, data, context)} compact />)}</div> : <EmptyState title="Your saved list is waiting." body="Save an opportunity to keep it close at hand." action={<Link className="button button-light" href="/opportunities">Explore opportunities <ArrowRight size={15} /></Link>} />}</section>
    <section className="saved-section"><div className="panel-heading"><div><p className="eyebrow">PEOPLE</p><h2>{profiles.length} saved profile{profiles.length === 1 ? "" : "s"}</h2></div><Link className="text-link" href="/people">Meet more people <ArrowRight size={15} /></Link></div>{profiles.length ? <div className="people-grid">{profiles.map((person) => <PersonCard key={person.id} person={person} data={data} context={context} />)}</div> : <p className="quiet-empty">Save a profile that inspires you and come back when you?re ready.</p>}</section>
  </div>;
}

function SessionsPage({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const currentUser = data.currentUser;
  if (!currentUser) return <InfoPage title="Choose a profile to see your sessions." description="Mentoring and advisory requests are private to the people involved." action={<Link className="button button-dark" href="/login">Choose a demo profile <ArrowRight size={16} /></Link>} />;
  const sessions = [...data.mentoringSessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const update = (sessionId: string, action: "accept" | "decline" | "cancel" | "complete") =>
    void context.performAction({ type: "session-update", sessionId, action });
  return <div className="content-page">
    <PageHeading eyebrow="Guidance, with a next step" title="Mentoring & advisory." description="Session requests are private to the requester and provider. Booking here does not create a calendar invite or payment." action={<Link className="button button-dark button-small" href="/people">Find a mentor <Users size={15} /></Link>} />
    {sessions.length ? <div className="session-list">{sessions.map((session) => {
      const isProvider = session.providerId === currentUser.id;
      const canRespond = isProvider && session.status === "requested";
      const canCancel = !isProvider && (session.status === "requested" || session.status === "accepted");
      const canComplete = isProvider && session.status === "accepted" && (!session.scheduledFor || new Date(session.scheduledFor) <= new Date());
      return <article className="session-card" key={session.id}>
        <PersonAvatar person={session.otherPerson} />
        <div className="session-card-copy"><span className="demo-pill">LOCAL DEMO SESSION</span><h2>{session.serviceType.replaceAll("-", " ")}</h2><p>{isProvider ? "Requested by" : "With"} <Link href={`/people/${session.otherPerson.id}`}>{session.otherPerson.name}</Link></p>{session.requestNote ? <p>{session.requestNote}</p> : null}<small>{session.scheduledFor ? `Proposed ${new Date(session.scheduledFor).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : "Time to be agreed directly"} · updated {new Date(session.updatedAt).toLocaleDateString("en-IN")}</small></div>
        <span className={`listing-status listing-${session.status}`}>{session.status}</span>
        <div className="session-card-actions">{canRespond ? <><button type="button" className="button button-dark button-small" disabled={context.busy} onClick={() => update(session.id, "accept")}>Accept</button><button type="button" className="button button-light button-small" disabled={context.busy} onClick={() => update(session.id, "decline")}>Decline</button></> : null}{canCancel ? <button type="button" className="button button-light button-small" disabled={context.busy} onClick={() => update(session.id, "cancel")}>Cancel request</button> : null}{canComplete ? <button type="button" className="button button-soft button-small" disabled={context.busy} onClick={() => update(session.id, "complete")}>Mark complete</button> : null}{session.documents.map((document) => <a className="button button-light button-small" href={`/api/session-documents/${document.id}`} key={document.id}><FileCheck2 size={14} />{document.fileName}</a>)}</div>
        {!isProvider && (session.serviceType === "cv-review" || session.serviceType === "pitch-review") && (session.status === "requested" || session.status === "accepted") ? <SessionDocumentForm sessionId={session.id} context={context} /> : null}
      </article>;
    })}</div> : <EmptyState title="Your mentoring calendar is clear." body="Explore mentor or advisor profiles and request a session when you find someone who fits." action={<Link className="button button-dark" href="/people">Explore people <Users size={15} /></Link>} />}
  </div>;
}

function SessionDocumentForm({ sessionId, context }: { sessionId: string; context: RouteContext }) {
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/documents`, { method: "POST", body: form });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string" ? result.error : "The document could not be uploaded.";
        throw new Error(message);
      }
      setNotice("Private PDF uploaded. Only you and an accepted review provider can access it.");
      formElement.reset();
      context.navigate("/sessions");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The document could not be uploaded.");
    }
  }
  return <form className="session-document-form" onSubmit={upload}><label>Share a private PDF <input type="file" name="file" accept="application/pdf,.pdf" required /></label><button type="submit" className="button button-light button-small">Upload securely</button>{notice ? <span role="status">{notice}</span> : null}{error ? <span role="alert">{error}</span> : null}<small>PDF only · 5 MB max · stored locally on this server</small></form>;
}

const statusLabels: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  reviewing: "In review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  accepted: "Accepted",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

const allowedTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ["reviewing", "shortlisted", "rejected", "withdrawn"],
  reviewing: ["shortlisted", "interview", "accepted", "rejected", "withdrawn"],
  shortlisted: ["interview", "accepted", "rejected", "withdrawn"],
  interview: ["accepted", "rejected", "withdrawn"],
  accepted: [],
  rejected: [],
  withdrawn: [],
};

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`status-badge status-${status}`}>{statusLabels[status]}</span>;
}

function ApplicationsPage({ data }: { data: BootstrapData }) {
  const own = data.applications.filter((application) => application.applicantId === data.currentUser?.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return <div className="content-page"><PageHeading eyebrow="Every step, in one place" title="Your applications." description="Follow your application journey and see each update as it arrives." action={<span className="count-chip">{own.length} total</span>} />{own.length ? <div className="application-list">{own.map((application) => <ApplicationRow key={application.id} application={application} />)}</div> : <EmptyState title="Your application story starts here." body="Browse opportunities, find a fit, and send in your first application." action={<Link className="button button-dark" href="/opportunities">Explore opportunities <ArrowRight size={15} /></Link>} />}</div>;
}

function ApplicationRow({ application }: { application: BootstrapData["applications"][number] }) {
  return <article className="application-row"><span className="application-mark"><FileCheck2 size={19} /></span><div className="application-row-copy"><Link href={`/applications/${application.id}`}><b>{application.opportunity?.title ?? "Opportunity application"}</b></Link><span>{application.opportunity?.organization ?? "Demo publisher"} · {new Date(application.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>{application.applicant ? <small>Applicant: {application.applicant.name} · demo profile</small> : null}</div><StatusBadge status={application.status} /><Link className="icon-button" href={`/applications/${application.id}`} aria-label="View application details"><ArrowRight size={16} /></Link></article>;
}

function ApplicationDetail({ id, data, context }: { id: string; data: BootstrapData; context: RouteContext }) {
  const application = data.applications.find((item) => item.id === id);
  if (!application || !application.opportunity) return <InfoPage title="This application isn?t available." description="Application details are only shared with the applicant, the opportunity publisher, and authorized administrators." action={<Link className="button button-dark" href="/applications">Back to applications <ArrowRight size={16} /></Link>} />;
  const own = application.applicantId === data.currentUser?.id;
  const canWithdraw = own && allowedTransitions[application.status].includes("withdrawn");
  return <div className="content-page narrow-page"><Link className="back-link" href="/applications"><ArrowLeft size={16} /> Your applications</Link><div className="application-detail-card"><p className="eyebrow">APPLICATION DETAILS · DEMO</p><div className="application-detail-heading"><h1>{application.opportunity.title}</h1><StatusBadge status={application.status} /></div><p className="company-line">{application.opportunity.organization}</p><div className="application-timeline">{application.statusHistory.map((event) => <div key={event.id}><Check size={15} /><span><b>{event.fromStatus === null ? "Application submitted" : `Status changed to ${statusLabels[event.toStatus]}`}</b><small>{new Date(event.createdAt).toLocaleString("en-IN")} · {event.actorLabel}</small></span></div>)}</div><section className="detail-section"><p className="eyebrow">YOUR NOTE</p><h2>What you shared</h2><p>{application.coverNote || "No cover note was added to this application."}</p></section>{application.internalNote && (application.opportunity.publisherId === data.currentUser?.id || data.isAdmin) ? <section className="private-note"><ShieldCheck size={17} /><div><b>Internal publisher note</b><p>{application.internalNote}</p></div></section> : null}
    {canWithdraw ? <button type="button" className="button button-light" onClick={() => void context.performAction({ type: "withdraw-application", applicationId: application.id })}>Withdraw application</button> : null}
    <Link className="text-link" href={`/opportunities/${application.opportunity.id}`}>View opportunity <ArrowUpRight size={15} /></Link></div></div>;
}

function PublishPage({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const numberOrNull = (key: string) => {
      const value = String(form.get(key) ?? "").trim();
      return value ? Number(value) : null;
    };
    try {
      await context.postJson("/api/opportunities", {
        title: form.get("title"),
        type: form.get("type"),
        category: form.get("category"),
        description: form.get("description"),
        skills: String(form.get("skills") ?? "").split(",").map((skill) => skill.trim()).filter(Boolean),
        location: form.get("location"),
        remote: form.get("remote") === "on",
        deadline: new Date(`${String(form.get("deadline"))}T23:59:00`).toISOString(),
        compensationMin: numberOrNull("compensationMin"),
        compensationMax: numberOrNull("compensationMax"),
        compensationUnit: form.get("compensationUnit"),
      });
      context.navigate("/manage-opportunities");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The opportunity could not be published.");
      setSubmitting(false);
    }
  }
  const userRoles = data.currentUser?.roles ?? [];
  const allowedTypes: OpportunityType[] = userRoles.some((role) => ["founder", "recruiter"].includes(role))
    ? typeOptions.map(([type]) => type)
    : [
        ...(userRoles.includes("mentor") ? ["mentorship" as const] : []),
        ...(userRoles.includes("advisor") ? ["advisory" as const] : []),
      ];
  if (allowedTypes.length === 0) return <InfoPage title="Your profile cannot publish yet." description="Publishing is available to founder, recruiter, mentor, and advisor roles. Add one of these roles in your profile to continue." action={<Link className="button button-dark" href="/profile">Update your roles <ArrowRight size={16} /></Link>} />;
  return <div className="content-page narrow-page"><PageHeading eyebrow="Give a good idea room to grow" title="Publish an opportunity." description="Create a fictional demo listing that connects your idea with someone ready to make it real." /><div className="form-card publish-form-card"><div className="demo-note-inline"><Sparkles size={16} /><span>New listings are immediately visible in the local demo and clearly labeled as fictional.</span></div>{error ? <FlashMessage flash={{ tone: "error", message: error }} /> : null}<form className="form-stack" onSubmit={submit}>
    <label>Opportunity title<input name="title" required minLength={1} maxLength={100} placeholder="e.g. Product Design Intern" /></label>
    <div className="form-row"><label>Type<select name="type" required>{allowedTypes.map((type) => <option key={type} value={type}>{opportunityTypeNames[type]}</option>)}</select></label><label>Category<input name="category" required maxLength={50} placeholder="Engineering, Climate, Design…" /></label></div>
    <label>Description<textarea name="description" rows={5} required minLength={1} maxLength={3000} placeholder="What would this person work on? What might they learn?" /></label>
    <label>Skills <span className="optional-label">Separate with commas · up to 12</span><input name="skills" required placeholder="React, research, communication" /></label>
    <div className="form-row"><label>Location<input name="location" required maxLength={100} placeholder="City or region" /></label><label>Application deadline<input name="deadline" type="date" required min={new Date().toISOString().slice(0, 10)} /></label></div>
    <label className="checkbox-label"><input name="remote" type="checkbox" />Remote-friendly</label>
    <div className="form-row"><label>Minimum amount<input name="compensationMin" type="number" min="0" max="1000000000" placeholder="Optional" /></label><label>Maximum amount<input name="compensationMax" type="number" min="0" max="1000000000" placeholder="Optional" /></label></div>
    <label>Compensation unit<input name="compensationUnit" required maxLength={50} defaultValue="INR / month" placeholder="INR / month, INR / project, flexible…" /></label>
    <p className="form-hint"><ShieldCheck size={15} />Your publisher profile is shown on the listing. Avoid adding private applicant information or misleading claims.</p>
    <button className="button button-dark" type="submit" disabled={submitting}>{submitting ? "Publishing…" : "Publish demo opportunity"} <ArrowRight size={16} /></button>
  </form></div></div>;
}

function ManageOpportunitiesPage({ data }: { data: BootstrapData }) {
  const owned = data.opportunities.filter((opportunity) => opportunity.publisherId === data.currentUser?.id);
  return <div className="content-page"><PageHeading eyebrow="Your publisher workspace" title="Your opportunities." description="Manage the fictional listings you have published in this demo." action={<Link className="button button-dark button-small" href="/publish"><Plus size={16} />Publish an opportunity</Link>} />{owned.length ? <div className="publisher-list">{owned.map((opportunity) => <article className="publisher-list-row" key={opportunity.id}><span className="application-mark"><BriefcaseBusiness size={18} /></span><div className="publisher-list-copy"><Link href={`/opportunities/${opportunity.id}`}><b>{opportunity.title}</b></Link><span>{opportunity.organization} · {opportunityTypeNames[opportunity.type]}</span><small>{data.applications.filter((application) => application.opportunityId === opportunity.id).length} applications · deadline {new Date(opportunity.deadline).toLocaleDateString("en-IN")}</small></div><span className={`listing-status listing-${opportunity.status}`}>{opportunity.status}</span><Link className="button button-light button-small" href="/manage-applicants">Review applicants</Link></article>)}</div> : <EmptyState title="Your first listing is waiting to be written." body="Publish an opportunity to invite the right people into your story." action={<Link className="button button-dark" href="/publish">Publish a listing <Plus size={16} /></Link>} />}</div>;
}

function ManageApplicantsPage({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const applications = data.applications.filter((application) => application.opportunity?.publisherId === data.currentUser?.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const [filter, setFilter] = useState("");
  const filtered = filter ? applications.filter((application) => application.status === filter) : applications;
  return <div className="content-page"><PageHeading eyebrow="Publisher workspace" title="Meet the people who applied." description="Review demo applications on listings you own. Publisher notes are kept private from applicants." action={<Link className="button button-light button-small" href="/manage-opportunities">Your listings <ArrowRight size={15} /></Link>} />
    <div className="applicant-toolbar"><span>{filtered.length} applications to review</span><label>Filter by status<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">All statuses</option>{Object.entries(statusLabels).filter(([status]) => status !== "withdrawn").map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></label></div>
    {filtered.length ? <div className="applicant-list">{filtered.map((application) => <ApplicantCard key={application.id} application={application} context={context} />)}</div> : <EmptyState title={applications.length ? "No applications with this status." : "Your applicants will show up here."} body={applications.length ? "Choose another status filter to see more applications." : "Publish an opportunity and demo applications will appear in this workspace."} action={applications.length ? <button className="button button-light" type="button" onClick={() => setFilter("")}>Show all</button> : <Link className="button button-dark" href="/publish">Publish an opportunity <Plus size={16} /></Link>} />}
  </div>;
}

function ApplicantCard({ application, context }: { application: BootstrapData["applications"][number]; context: RouteContext }) {
  const [note, setNote] = useState(application.internalNote ?? "");
  const nextStatuses = allowedTransitions[application.status].filter((status) => status !== "withdrawn");
  return <article className="applicant-card"><div className="applicant-card-header">{application.applicant ? <><PersonAvatar person={application.applicant} /><div><b>{application.applicant.name}</b><small>{application.applicant.headline} · demo profile</small></div></> : null}<StatusBadge status={application.status} /><Link className="text-link" href={`/applications/${application.id}`}>Application details <ArrowUpRight size={14} /></Link></div><div className="applicant-card-body"><span className="eyebrow">APPLIED TO</span><b>{application.opportunity?.title}</b><span className="applicant-cover-note">{application.coverNote || "No introduction note was included."}</span><span className="field-hint">Submitted {new Date(application.submittedAt).toLocaleDateString("en-IN")} · demo application</span>{application.internalNote ? <div className="private-note"><ShieldCheck size={16} /><span><b>Private publisher note:</b> {application.internalNote}</span></div> : null}
    <label className="internal-note-editor">Add or update private note<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Notes only you and authorized admins can see" maxLength={300} /></label>
    <button className="button button-light button-small" type="button" onClick={() => void context.performAction({ type: "publisher-note", applicationId: application.id, internalNote: note })}>Save private note</button>
    <div className="applicant-actions">{nextStatuses.map((status) => <button key={status} type="button" className={`button ${status === "rejected" ? "button-light" : "button-soft"} button-small`} onClick={() => void context.performAction({ type: "application-status", applicationId: application.id, status })}>{statusLabels[status]}</button>)}</div>
  </div></article>;
}

function RecommendationsPage({ data, context }: { data: BootstrapData; context: RouteContext }) {
  const user = data.currentUser;
  if (!user) return <InfoPage title="Recommendations need a little context." description="Choose a demo profile or add your skills and interests so suggestions can become relevant to you." action={<Link className="button button-dark" href="/login">Choose a demo profile <ArrowRight size={16} /></Link>} />;
  const profile = findStoredUser(user, data.people);
  const recommendations = recommendOpportunities(profile, data.opportunities, new Date());
  return <div className="content-page"><PageHeading eyebrow="A few ideas, picked for you" title="Your next possibilities." description="Recommendations use a transparent rule-based score from skills, interests, role, location, experience, and deadline. They are a discovery estimate, not a hiring prediction." action={<Link className="button button-light button-small" href="/profile">Tune your profile <ArrowRight size={14} /></Link>} />
    <div className="recommendation-explain"><Sparkles size={18} /><p><b>How the match estimate works:</b> 40% skill overlap · 20% interests · 15% role fit · 10% location · 10% experience · 5% deadline. Eligible listings are filtered before scoring. <Link href="/how-it-works">Learn more</Link></p></div>
    {recommendations.length ? <div className="opportunity-grid">{recommendations.map(({ opportunity, score, reasons }) => <article key={opportunity.id} className="recommendation-card"><OpportunityCard opportunity={opportunity} publisher={data.people.find((person) => person.id === opportunity.publisherId)} saved={data.savedOpportunityIds.includes(opportunity.id)} onSave={() => handleSave(opportunity, data, context)} score={score} /><div className="recommendation-reasons"><span className="eyebrow">WHY THIS SHOWED UP</span><ul>{reasons.map((reason) => <li key={reason}><Check size={13} />{reason}</li>)}</ul></div></article>)}</div> : <EmptyState title="No recommendations yet." body="Try adding a few skills and interests to your profile, then check back." action={<Link className="button button-light" href="/profile">Update profile <ArrowRight size={15} /></Link>} />}
  </div>;
}

function AdminPage({ path, data, context }: { path: string; data: BootstrapData; context: RouteContext }) {
  const [key, setKey] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const summary = data.adminSummary;
  if (!data.isAdmin || !summary) {
    return <div className="content-page narrow-page"><div className="admin-gate-card"><span className="auth-icon"><ShieldCheck size={21} /></span><p className="eyebrow">RESTRICTED ADMIN AREA</p><h1>Administrator access is separate.</h1><p>Regular demo profile selection never grants admin permissions. Admin mode requires an administrator key configured on the server.</p>{error ? <FlashMessage flash={{ tone: "error", message: error }} /> : null}
      <form className="form-stack" onSubmit={async (event) => { event.preventDefault(); setWorking(true); setError(""); try { await context.postJson("/api/admin/session", { key }); context.navigate("/admin"); } catch (loginError) { setError(loginError instanceof Error ? loginError.message : "Admin access could not be confirmed."); setWorking(false); } }}><label>Server-configured demo admin key<input type="password" value={key} onChange={(event) => setKey(event.target.value)} autoComplete="current-password" /></label><button className="button button-dark" type="submit" disabled={working || !key}>{working ? "Checking…" : "Enter admin demo"}</button></form>
      <p className="field-hint">If admin access isn?t configured, this workspace remains safely read-only for administrators. See the README for setup notes.</p>
    </div></div>;
  }
  const users = summary.users;
  const opportunities = summary.opportunities;
  const isUsers = path === "/admin/users";
  const isOpportunities = path === "/admin/opportunities";
  const userAction = async (userId: string, action: "disable" | "restore") => {
    await context.performAction({ type: "moderate-user", userId, action, reason: reason || "Reviewed in the local demo admin workspace." });
  };
  const opportunityAction = async (opportunityId: string, action: "pause" | "publish" | "reject") => {
    await context.performAction({ type: "moderate-opportunity", opportunityId, action, reason: reason || "Reviewed in the local demo admin workspace." });
  };
  const reviewReport = (reportId: string, status: "reviewed" | "dismissed") =>
    void context.performAction({ type: "review-report", reportId, status });
  return <div className="content-page admin-page"><PageHeading eyebrow="Trusted operations only" title="Administration." description="Review demo content and record moderation actions. This session was authenticated with a server-side admin key." action={<span className="secure-badge"><ShieldCheck size={14} /> Admin session</span>} /><nav className="admin-tabs" aria-label="Admin areas"><Link className={!isUsers && !isOpportunities ? "active" : ""} href="/admin">Overview</Link><Link className={isUsers ? "active" : ""} href="/admin/users">Users</Link><Link className={isOpportunities ? "active" : ""} href="/admin/opportunities">Opportunities</Link></nav>
    <label className="admin-reason">Moderation reason <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} placeholder="Add a short reason for the audit record" /></label>
    {isUsers ? <section className="admin-section"><h2>Demo users <span className="count-chip">{users.length}</span></h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Profile</th><th>Role</th><th>Account state</th><th>Action</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><b>{user.name}</b><small>{user.email} · demo account</small></td><td>{roleNames[user.role]}</td><td><span className={`listing-status listing-${user.status}`}>{user.status}</span></td><td><button className="button button-light button-small" type="button" onClick={() => void userAction(user.id, user.status === "active" ? "disable" : "restore")}>{user.status === "active" ? "Disable" : "Restore"}</button></td></tr>)}</tbody></table></div></section>
      : isOpportunities ? <section className="admin-section"><h2>Opportunity moderation <span className="count-chip">{opportunities.length}</span></h2><div className="admin-list">{opportunities.map((opportunity) => <article className="publisher-list-row" key={opportunity.id}><span className="application-mark"><BriefcaseBusiness size={18} /></span><div className="publisher-list-copy"><b>{opportunity.title}</b><span>{opportunity.organization}</span><small>Publisher: {users.find((user) => user.id === opportunity.publisherId)?.name ?? "unknown"}</small></div><span className={`listing-status listing-${opportunity.status}`}>{opportunity.status}</span>{opportunity.status === "published" ? <button type="button" className="button button-light button-small" onClick={() => void opportunityAction(opportunity.id, "pause")}>Pause</button> : <button type="button" className="button button-soft button-small" onClick={() => void opportunityAction(opportunity.id, "publish")}>Publish</button>}<button type="button" className="text-button danger-text" onClick={() => void opportunityAction(opportunity.id, "reject")}>Reject</button></article>)}</div></section>
        : <><div className="admin-metrics"><div><span>Profiles</span><strong>{users.length}</strong><small>fictional demo members</small></div><div><span>Listings</span><strong>{opportunities.length}</strong><small>sample and publisher-created</small></div><div><span>Applications</span><strong>{data.applications.length}</strong><small>linked demo records</small></div><div><span>Open reports</span><strong>{summary.reports.filter((report) => report.status === "open").length}</strong><small>trust and safety queue</small></div></div><div className="dashboard-grid"><section className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">TRUST & SAFETY</p><h2>Open reports</h2></div></div>{summary.reports.filter((report) => report.status === "open").length ? summary.reports.filter((report) => report.status === "open").map((report) => <article className="contact-inbox-item" key={report.id}><b>{report.targetType} report · {report.reason}</b><p>{report.details || "No additional details were submitted."}</p><small>Reporter: {users.find((user) => user.id === report.reporterId)?.name ?? "demo profile"} · {new Date(report.createdAt).toLocaleString("en-IN")}</small><div className="session-card-actions"><button type="button" className="button button-dark button-small" onClick={() => reviewReport(report.id, "reviewed")}>Mark reviewed</button><button type="button" className="button button-light button-small" onClick={() => reviewReport(report.id, "dismissed")}>Dismiss</button></div></article>) : <p className="quiet-empty">No open reports. User-submitted reports are only visible to administrators.</p>}</section><section className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">RECENT MODERATION</p><h2>Recorded actions</h2></div></div>{summary.moderationRecords.length ? summary.moderationRecords.slice(-5).reverse().map((record) => <div className="moderation-row" key={record.id}><b>{record.action} · {record.targetType}</b><span>{record.reason}</span><small>{new Date(record.createdAt).toLocaleString("en-IN")}</small></div>) : <p className="quiet-empty">No moderation actions yet. Each action will record its target, reason, actor, and timestamp.</p>}</section><section className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">LOCAL CONTACT INBOX</p><h2>{summary.contactSubmissions.length} saved messages</h2></div><Link className="text-link" href="/contact">Contact form <ArrowRight size={14} /></Link></div>{summary.contactSubmissions.slice(-4).reverse().map((item) => <article className="contact-inbox-item" key={item.id}><b>{item.topic}</b><span>{item.name} · {item.email}</span><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString("en-IN")} · no email sent</small></article>)}</section></div><div className="admin-shortcuts"><Link className="button button-light" href="/admin/users">Review demo users <ArrowRight size={15} /></Link><Link className="button button-light" href="/admin/opportunities">Review listings <ArrowRight size={15} /></Link></div></>}
    <div className="audit-note"><ShieldCheck size={18} /><p>Every moderation action requires this verified admin session and a reason. Role selection in the public demo cannot elevate permissions.</p></div>
  </div>;
}

function InfoPage({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="content-page narrow-page"><div className="info-page-card"><span className="empty-state-icon"><Compass size={22} /></span><p className="eyebrow">OPPORTUNITYBRIDGE</p><h1>{title}</h1><p>{description}</p>{action ? <div className="empty-state-action">{action}</div> : null}<div className="info-links"><Link href="/opportunities">Explore opportunities</Link><Link href="/people">Meet the community</Link><Link href="/">Return home</Link></div></div></div>;
}
