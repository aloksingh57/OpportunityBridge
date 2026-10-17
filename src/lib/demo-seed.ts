import type {
  Application,
  Connection,
  Conversation,
  Message,
  NotificationRecord,
  Opportunity,
  OpportunityBridgeStore,
  OpportunityType,
  Role,
  UserProfile,
} from "@/types/opportunity-bridge";

const now = Date.now();
const isoDaysFromNow = (days: number) => new Date(now + days * 86_400_000).toISOString();
const pastDays = (days: number) => new Date(now - days * 86_400_000).toISOString();

const personas: Array<Omit<UserProfile, "isDemo" | "status">> = [
  { id: "student-aarav", name: "Aarav Sharma", email: "aarav@example.demo", role: "student", headline: "Computer science student · building useful things", bio: "Final-year student who enjoys turning thoughtful ideas into accessible products.", location: "Bengaluru, India", avatar: "AS", skills: ["React", "TypeScript", "Figma"], interests: ["engineering", "design", "climate"], experienceLevel: "student", remotePreference: "any" },
  { id: "student-priya", name: "Priya Mehta", email: "priya@example.demo", role: "student", headline: "Design student · curious about people and products", bio: "I make clear, inclusive experiences and want to learn from a collaborative team.", location: "Pune, India", avatar: "PM", skills: ["Figma", "UI design", "Research"], interests: ["design", "product"], experienceLevel: "student", remotePreference: "remote" },
  { id: "student-nikhil", name: "Nikhil Das", email: "nikhil@example.demo", role: "student", headline: "Data science student · open-source contributor", bio: "Exploring applied machine learning and responsible data products.", location: "Kolkata, India", avatar: "ND", skills: ["Python", "SQL", "Data analysis"], interests: ["data", "engineering"], experienceLevel: "student", remotePreference: "any" },
  { id: "job-ananya", name: "Ananya Rao", email: "ananya@example.demo", role: "job-seeker", headline: "Frontend engineer · accessibility advocate", bio: "Two years building fast, friendly web apps for growing teams.", location: "Hyderabad, India", avatar: "AR", skills: ["React", "TypeScript", "Accessibility"], interests: ["engineering", "product"], experienceLevel: "mid", remotePreference: "remote" },
  { id: "job-rohan", name: "Rohan Iyer", email: "rohan@example.demo", role: "job-seeker", headline: "Backend developer · thoughtful systems", bio: "Early-career engineer focused on dependable APIs and developer experience.", location: "Chennai, India", avatar: "RI", skills: ["Node.js", "PostgreSQL", "APIs"], interests: ["engineering", "data"], experienceLevel: "entry", remotePreference: "any" },
  { id: "job-fatima", name: "Fatima Ali", email: "fatima@example.demo", role: "job-seeker", headline: "Product analyst · making data useful", bio: "I connect customer questions to clear experiments and practical insights.", location: "Mumbai, India", avatar: "FA", skills: ["SQL", "Analytics", "Communication"], interests: ["data", "product"], experienceLevel: "entry", remotePreference: "remote" },
  { id: "founder-kabir", name: "Kabir Malhotra", email: "kabir@example.demo", role: "founder", headline: "Founder at GreenCart · less waste, better commerce", bio: "Building a fictional marketplace that helps local shops move surplus stock.", location: "Delhi, India", avatar: "KM", skills: ["Startups", "Product", "Operations"], interests: ["climate", "commerce"], experienceLevel: "senior", remotePreference: "any" },
  { id: "founder-isha", name: "Isha Kapoor", email: "isha@example.demo", role: "founder", headline: "Founder at SkillSpring · learning for everyone", bio: "Growing a fictional skills platform with an emphasis on practical learning.", location: "Jaipur, India", avatar: "IK", skills: ["Product", "Education", "Community"], interests: ["education", "startups"], experienceLevel: "senior", remotePreference: "any" },
  { id: "founder-aman", name: "Aman Verma", email: "aman@example.demo", role: "founder", headline: "Founder · building for a cleaner future", bio: "Working on early-stage tools for small businesses and sustainable supply chains.", location: "Ahmedabad, India", avatar: "AV", skills: ["Strategy", "Sales", "Climate"], interests: ["climate", "startups"], experienceLevel: "senior", remotePreference: "any" },
  { id: "investor-dev", name: "Dev Patel", email: "dev@example.demo", role: "investor", headline: "Early-stage investor · learning alongside founders", bio: "Interested in useful, resilient businesses and founder-first partnerships.", location: "Mumbai, India", avatar: "DP", skills: ["Venture capital", "Finance", "Strategy"], interests: ["climate", "fintech", "education"], experienceLevel: "senior", remotePreference: "any" },
  { id: "investor-neha", name: "Neha Banerjee", email: "neha@example.demo", role: "investor", headline: "Angel investor · future of work and learning", bio: "Happy to meet thoughtful founders building accessible products.", location: "Bengaluru, India", avatar: "NB", skills: ["Investing", "Hiring", "Go-to-market"], interests: ["education", "future of work"], experienceLevel: "senior", remotePreference: "any" },
  { id: "mentor-meera", name: "Meera Nair", email: "meera@example.demo", role: "mentor", headline: "Product mentor · 1:1 sessions open this month", bio: "I help early-career builders scope projects, tell their story, and grow with confidence.", location: "Kochi, India", avatar: "MN", skills: ["Product", "Career coaching", "Research"], interests: ["product", "education"], experienceLevel: "senior", remotePreference: "remote" },
  { id: "mentor-arjun", name: "Arjun Sen", email: "arjun@example.demo", role: "mentor", headline: "Engineering mentor · practical career guidance", bio: "I enjoy helping new engineers build strong fundamentals and kind teams.", location: "Gurugram, India", avatar: "AS", skills: ["Engineering", "Leadership", "Mentoring"], interests: ["engineering", "careers"], experienceLevel: "senior", remotePreference: "any" },
  { id: "advisor-vikram", name: "Vikram Rao", email: "vikram@example.demo", role: "advisor", headline: "Startup advisor · thoughtful growth and partnerships", bio: "Advising early teams on customer discovery, partnerships, and operating rhythm.", location: "Bengaluru, India", avatar: "VR", skills: ["Strategy", "Partnerships", "Operations"], interests: ["startups", "climate"], experienceLevel: "senior", remotePreference: "any" },
  { id: "advisor-leela", name: "Leela Thomas", email: "leela@example.demo", role: "advisor", headline: "People and culture advisor · teams that thrive", bio: "Supporting founders to build inclusive hiring and healthy team practices.", location: "Pune, India", avatar: "LT", skills: ["People operations", "Hiring", "Culture"], interests: ["startups", "careers"], experienceLevel: "senior", remotePreference: "remote" },
  { id: "recruiter-sara", name: "Sara Khan", email: "sara@example.demo", role: "recruiter", headline: "Talent partner at PixelNest Labs · thoughtful hiring", bio: "Connecting emerging engineers and designers with a fictional product studio.", location: "Bengaluru, India", avatar: "SK", skills: ["Recruiting", "Engineering", "Candidate experience"], interests: ["engineering", "design"], experienceLevel: "senior", remotePreference: "any" },
  { id: "recruiter-omar", name: "Omar Qureshi", email: "omar@example.demo", role: "recruiter", headline: "People partner · building teams with care", bio: "Hiring for roles where curiosity, collaboration, and craft matter.", location: "Noida, India", avatar: "OQ", skills: ["Talent acquisition", "Operations", "Communication"], interests: ["engineering", "business"], experienceLevel: "mid", remotePreference: "any" },
  { id: "recruiter-tara", name: "Tara Kulkarni", email: "tara@example.demo", role: "recruiter", headline: "Design recruiter · helping creative people find their place", bio: "A friendly guide for designers exploring new teams and projects.", location: "Mumbai, India", avatar: "TK", skills: ["Design recruiting", "Figma", "Interviewing"], interests: ["design", "careers"], experienceLevel: "mid", remotePreference: "remote" },
];

const opportunitySeeds: Array<{
  publisherId: string;
  organization: string;
  title: string;
  type: OpportunityType;
  category: string;
  skills: string[];
  location: string;
  remote: boolean;
  compensationMin: number | null;
  compensationMax: number | null;
  compensationUnit: string;
}> = [
  { publisherId: "recruiter-sara", organization: "PixelNest Labs (fictional)", title: "Frontend Developer Intern", type: "internship", category: "Engineering", skills: ["React", "TypeScript", "CSS"], location: "Bengaluru, India", remote: true, compensationMin: 18000, compensationMax: 25000, compensationUnit: "INR / month" },
  { publisherId: "recruiter-omar", organization: "DevOrbit (fictional)", title: "Full-Stack Developer Intern", type: "internship", category: "Engineering", skills: ["React", "Node.js", "SQL"], location: "Pune, India", remote: true, compensationMin: 15000, compensationMax: 22000, compensationUnit: "INR / month" },
  { publisherId: "recruiter-omar", organization: "MetricMint (fictional)", title: "Data Analyst Intern", type: "internship", category: "Data", skills: ["SQL", "Python", "Data analysis"], location: "Remote — India", remote: true, compensationMin: 16000, compensationMax: 24000, compensationUnit: "INR / month" },
  { publisherId: "recruiter-tara", organization: "Paperplane Studio (fictional)", title: "UI/UX Design Intern", type: "internship", category: "Design", skills: ["Figma", "UI design", "Research"], location: "Mumbai, India", remote: false, compensationMin: 14000, compensationMax: 20000, compensationUnit: "INR / month" },
  { publisherId: "recruiter-sara", organization: "CloudHarbor (fictional)", title: "Junior Backend Engineer", type: "full-time", category: "Engineering", skills: ["Node.js", "PostgreSQL", "APIs"], location: "Hyderabad, India", remote: true, compensationMin: 650000, compensationMax: 950000, compensationUnit: "INR / year" },
  { publisherId: "founder-kabir", organization: "GreenCart (fictional)", title: "Community Growth Fellow", type: "internship", category: "Business", skills: ["Community", "Writing", "Research"], location: "Delhi, India", remote: true, compensationMin: 12000, compensationMax: 18000, compensationUnit: "INR / month" },
  { publisherId: "founder-isha", organization: "SkillSpring (fictional)", title: "Learning Experience Designer", type: "freelance", category: "Design", skills: ["Figma", "Education", "Research"], location: "Remote — India", remote: true, compensationMin: 30000, compensationMax: 50000, compensationUnit: "INR / project" },
  { publisherId: "founder-aman", organization: "TerraLoop (fictional)", title: "Climate Builders Weekend", type: "hackathon", category: "Climate", skills: ["Prototyping", "Climate", "Teamwork"], location: "Ahmedabad, India", remote: false, compensationMin: 100000, compensationMax: 250000, compensationUnit: "INR / prizes" },
  { publisherId: "founder-isha", organization: "SkillSpring (fictional)", title: "Student Learning Research Project", type: "student-project", category: "Education", skills: ["Research", "Writing", "Education"], location: "Remote — India", remote: true, compensationMin: 8000, compensationMax: 12000, compensationUnit: "INR / project" },
  { publisherId: "founder-kabir", organization: "GreenCart (fictional)", title: "Future of Commerce Scholarship", type: "scholarship", category: "Scholarship", skills: ["Commerce", "Climate", "Communication"], location: "India", remote: true, compensationMin: 50000, compensationMax: 100000, compensationUnit: "INR / award" },
  { publisherId: "founder-kabir", organization: "GreenCart (fictional)", title: "Pre-seed funding for circular commerce", type: "startup-funding", category: "Funding", skills: ["Commerce", "Climate", "Startups"], location: "India", remote: true, compensationMin: 1000000, compensationMax: 5000000, compensationUnit: "INR / investment" },
  { publisherId: "mentor-meera", organization: "OpportunityBridge demo community", title: "Product mentorship for early builders", type: "mentorship", category: "Mentorship", skills: ["Product", "Research", "Career coaching"], location: "Remote — India", remote: true, compensationMin: null, compensationMax: null, compensationUnit: "Free · 3 sessions" },
  { publisherId: "advisor-vikram", organization: "OpportunityBridge demo community", title: "Advisory support for early-stage founders", type: "advisory", category: "Advisory", skills: ["Strategy", "Partnerships", "Operations"], location: "Bengaluru, India", remote: true, compensationMin: null, compensationMax: null, compensationUnit: "Equity discussion" },
  { publisherId: "recruiter-omar", organization: "MetricMint (fictional)", title: "Associate Product Analyst", type: "full-time", category: "Data", skills: ["SQL", "Analytics", "Communication"], location: "Mumbai, India", remote: true, compensationMin: 700000, compensationMax: 1000000, compensationUnit: "INR / year" },
  { publisherId: "recruiter-sara", organization: "PixelNest Labs (fictional)", title: "Remote React Engineer", type: "full-time", category: "Engineering", skills: ["React", "TypeScript", "Accessibility"], location: "Remote — India", remote: true, compensationMin: 900000, compensationMax: 1400000, compensationUnit: "INR / year" },
  { publisherId: "recruiter-tara", organization: "Paperplane Studio (fictional)", title: "Brand Design Sprint", type: "freelance", category: "Design", skills: ["Figma", "Brand design", "Communication"], location: "Remote — India", remote: true, compensationMin: 45000, compensationMax: 70000, compensationUnit: "INR / project" },
  { publisherId: "founder-aman", organization: "TerraLoop (fictional)", title: "Build for Good Student Challenge", type: "hackathon", category: "Climate", skills: ["Prototyping", "Teamwork", "Climate"], location: "Remote — India", remote: true, compensationMin: 50000, compensationMax: 150000, compensationUnit: "INR / prizes" },
  { publisherId: "founder-isha", organization: "SkillSpring (fictional)", title: "Learning Leaders Scholarship", type: "scholarship", category: "Scholarship", skills: ["Education", "Writing", "Research"], location: "India", remote: true, compensationMin: 25000, compensationMax: 75000, compensationUnit: "INR / award" },
  { publisherId: "founder-isha", organization: "SkillSpring (fictional)", title: "Seed investment for accessible learning", type: "startup-funding", category: "Funding", skills: ["Education", "Startups", "Product"], location: "India", remote: true, compensationMin: 2000000, compensationMax: 8000000, compensationUnit: "INR / investment" },
  { publisherId: "mentor-arjun", organization: "OpportunityBridge demo community", title: "Engineering career mentoring circle", type: "mentorship", category: "Mentorship", skills: ["Engineering", "Leadership", "Mentoring"], location: "Remote — India", remote: true, compensationMin: null, compensationMax: null, compensationUnit: "Free · monthly" },
  { publisherId: "advisor-leela", organization: "OpportunityBridge demo community", title: "People practices advisor for small teams", type: "advisory", category: "Advisory", skills: ["People operations", "Hiring", "Culture"], location: "Remote — India", remote: true, compensationMin: null, compensationMax: null, compensationUnit: "Flexible" },
  { publisherId: "recruiter-sara", organization: "CloudHarbor (fictional)", title: "QA Automation Intern", type: "internship", category: "Engineering", skills: ["Testing", "JavaScript", "Communication"], location: "Hyderabad, India", remote: false, compensationMin: 16000, compensationMax: 24000, compensationUnit: "INR / month" },
  { publisherId: "founder-kabir", organization: "GreenCart (fictional)", title: "Local commerce student project", type: "student-project", category: "Business", skills: ["Research", "Commerce", "Communication"], location: "Delhi, India", remote: true, compensationMin: 10000, compensationMax: 18000, compensationUnit: "INR / project" },
  { publisherId: "recruiter-omar", organization: "DevOrbit (fictional)", title: "Backend API Contractor", type: "part-time", category: "Engineering", skills: ["Node.js", "PostgreSQL", "APIs"], location: "Remote — India", remote: true, compensationMin: 45000, compensationMax: 65000, compensationUnit: "INR / month" },
  { publisherId: "recruiter-tara", organization: "Paperplane Studio (fictional)", title: "Junior Product Designer", type: "full-time", category: "Design", skills: ["Figma", "UI design", "Research"], location: "Pune, India", remote: true, compensationMin: 550000, compensationMax: 800000, compensationUnit: "INR / year" },
  { publisherId: "founder-aman", organization: "TerraLoop (fictional)", title: "Operations Associate", type: "part-time", category: "Business", skills: ["Operations", "Climate", "Communication"], location: "Ahmedabad, India", remote: false, compensationMin: 20000, compensationMax: 30000, compensationUnit: "INR / month" },
];

function buildOpportunity(seed: (typeof opportunitySeeds)[number], index: number): Opportunity {
  const days = index === 24 ? -4 : 28 + index * 2;
  return {
    id: `op-${String(index + 1).padStart(3, "0")}`,
    publisherId: seed.publisherId,
    organization: seed.organization,
    title: seed.title,
    type: seed.type,
    category: seed.category,
    description: `${seed.title} is a fictional ${seed.type.replaceAll("-", " ")} opportunity created for the OpportunityBridge product demo. Work with a small, supportive team on a clearly scoped challenge and share what you learn.`,
    responsibilities: ["Collaborate with the publisher and a small cross-functional team.", "Share progress regularly and ask questions early.", "Complete a practical project with clear learning goals."],
    eligibility: ["Relevant interests or equivalent project experience.", "Able to communicate and collaborate with the listed team.", "Demo listing only — confirm details directly before making real commitments."],
    skills: seed.skills,
    location: seed.location,
    remote: seed.remote,
    experienceLevel: index < 4 ? "student" : index < 10 ? "entry" : index < 18 ? "mid" : "entry",
    compensationMin: seed.compensationMin,
    compensationMax: seed.compensationMax,
    compensationUnit: seed.compensationUnit,
    deadline: isoDaysFromNow(days),
    status: index === 25 ? "draft" : index === 26 ? "closed" : "published",
    createdAt: pastDays(index + 1),
    isDemo: true,
  };
}

const opportunities = opportunitySeeds.map(buildOpportunity);
const applicationUsers = ["student-aarav", "student-priya", "student-nikhil", "job-ananya", "job-rohan", "job-fatima"];
const applicationStatuses = [
  "submitted", "reviewing", "shortlisted", "interview", "rejected",
  "accepted", "submitted", "reviewing", "shortlisted", "withdrawn",
  "submitted", "interview", "rejected", "reviewing", "accepted",
  "submitted", "shortlisted", "submitted", "reviewing", "rejected",
] as const;
const applications: Application[] = applicationStatuses.map((status, index) => ({
  id: `app-${String(index + 1).padStart(3, "0")}`,
  opportunityId: opportunities[index % 10]!.id,
  applicantId: applicationUsers[Math.floor(index / 4)] ?? applicationUsers[index % applicationUsers.length]!,
  status,
  coverNote: "I am excited about this opportunity and would love to contribute my skills while learning from the team.",
  internalNote: index % 3 === 0 ? "Demo note: review portfolio and project availability." : "",
  submittedAt: pastDays(index + 1),
  updatedAt: pastDays(index),
}));

const connections: Connection[] = [
  { id: "conn-001", requesterId: "student-aarav", recipientId: "mentor-meera", status: "accepted", createdAt: pastDays(16), updatedAt: pastDays(14) },
  { id: "conn-002", requesterId: "student-priya", recipientId: "student-aarav", status: "pending", createdAt: pastDays(1), updatedAt: pastDays(1) },
  { id: "conn-003", requesterId: "founder-kabir", recipientId: "investor-dev", status: "accepted", createdAt: pastDays(19), updatedAt: pastDays(18) },
  { id: "conn-004", requesterId: "founder-isha", recipientId: "advisor-vikram", status: "accepted", createdAt: pastDays(8), updatedAt: pastDays(8) },
  { id: "conn-005", requesterId: "job-ananya", recipientId: "recruiter-sara", status: "accepted", createdAt: pastDays(5), updatedAt: pastDays(4) },
  { id: "conn-006", requesterId: "student-nikhil", recipientId: "mentor-arjun", status: "pending", createdAt: pastDays(2), updatedAt: pastDays(2) },
];

const conversations: Conversation[] = [
  { id: "conversation-001", participantIds: ["student-aarav", "mentor-meera"], updatedAt: pastDays(1) },
  { id: "conversation-002", participantIds: ["founder-kabir", "investor-dev"], updatedAt: pastDays(2) },
  { id: "conversation-003", participantIds: ["job-ananya", "recruiter-sara"], updatedAt: pastDays(3) },
];

const messages: Message[] = [
  { id: "msg-001", conversationId: "conversation-001", senderId: "mentor-meera", body: "Hi Aarav! What kind of product challenge are you exploring this week?", createdAt: pastDays(2), readAt: pastDays(2) },
  { id: "msg-002", conversationId: "conversation-001", senderId: "student-aarav", body: "I am looking at making onboarding clearer for first-time users. I would love your thoughts.", createdAt: pastDays(1), readAt: null },
  { id: "msg-003", conversationId: "conversation-002", senderId: "founder-kabir", body: "Thanks for connecting. I would value feedback on our early circular-commerce model.", createdAt: pastDays(3), readAt: pastDays(2) },
  { id: "msg-004", conversationId: "conversation-002", senderId: "investor-dev", body: "Happy to hear more about the customers you are learning from.", createdAt: pastDays(2), readAt: null },
  { id: "msg-005", conversationId: "conversation-003", senderId: "recruiter-sara", body: "Thanks for applying, Ananya. We will share an update here soon.", createdAt: pastDays(4), readAt: pastDays(3) },
];

const notifications: NotificationRecord[] = [
  { id: "notif-001", userId: "student-aarav", type: "connection", title: "A mentor conversation is ready", body: "You are connected with Meera Nair. Send a message whenever you are ready.", href: "/messages", readAt: null, createdAt: pastDays(1), isDemo: true },
  { id: "notif-002", userId: "student-aarav", type: "application", title: "Application update", body: "Your application to Frontend Developer Intern is being reviewed.", href: "/applications", readAt: pastDays(1), createdAt: pastDays(2), isDemo: true },
  { id: "notif-003", userId: "founder-kabir", type: "system", title: "A new application is ready to review", body: "Open your applicant list to review demo applications for your opportunity.", href: "/manage-applicants", readAt: null, createdAt: pastDays(1), isDemo: true },
  { id: "notif-004", userId: "job-ananya", type: "message", title: "Sara sent you a message", body: "Your conversation about the application has a new message.", href: "/messages", readAt: null, createdAt: pastDays(3), isDemo: true },
];

export const seedStore: OpportunityBridgeStore = {
  version: 1,
  users: personas.map((person) => ({ ...person, isDemo: true, status: "active" })),
  opportunities,
  applications,
  connections,
  conversations,
  messages,
  notifications,
  savedOpportunities: [
    { userId: "student-aarav", opportunityId: "op-001", createdAt: pastDays(4) },
    { userId: "student-aarav", opportunityId: "op-003", createdAt: pastDays(2) },
    { userId: "student-priya", opportunityId: "op-004", createdAt: pastDays(3) },
    { userId: "job-ananya", opportunityId: "op-015", createdAt: pastDays(2) },
  ],
  savedProfiles: [
    { userId: "student-aarav", savedProfileId: "mentor-meera", createdAt: pastDays(3) },
    { userId: "founder-kabir", savedProfileId: "investor-dev", createdAt: pastDays(2) },
  ],
  moderationRecords: [],
  contactSubmissions: [],
};

export const demoPersonas: Array<{ id: string; label: string; role: Role }> = personas.map(({ id, name, role }) => ({
  id,
  label: name,
  role,
}));
