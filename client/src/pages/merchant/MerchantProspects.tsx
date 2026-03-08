import MerchantLayout from "@/components/MerchantLayout";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ExternalLink, Twitter, Linkedin, Mail, Search, Building2, Users, DollarSign, Star } from "lucide-react";

type Prospect = {
  id: number;
  name: string;
  title: string;
  company: string;
  companyDesc: string;
  employees: string;
  revenue: string;
  funding: string;
  techStack: string;
  email?: string;
  twitter?: string;
  twitterHandle?: string;
  linkedin?: string;
  linkedinHandle?: string;
  fitScore: 1 | 2 | 3 | 4 | 5;
  fitReason: string;
  source: "existing" | "linkedin";
  category: string;
};

const prospects: Prospect[] = [
  // ─── EXISTING PROSPECTS (enriched) ───────────────────────────────────────
  {
    id: 1,
    name: "Tope Awotona",
    title: "Founder & CEO",
    company: "Calendly",
    companyDesc: "Scheduling automation platform used by 20M+ users and 100K+ companies.",
    employees: "354",
    revenue: "$350M ARR",
    funding: "$350.9M (Series A)",
    techStack: "Stripe (billing), freemium + 14-day paid trial",
    email: "tope@calendly.com",
    twitter: "https://twitter.com/tope_awotona",
    twitterHandle: "@tope_awotona",
    linkedin: "https://www.linkedin.com/in/topeawotona",
    linkedinHandle: "topeawotona",
    fitScore: 5,
    fitReason: "Large freemium user base with established Stripe billing — ideal for incentive-driven trial-to-paid conversion.",
    source: "existing",
    category: "Scheduling",
  },
  {
    id: 2,
    name: "Vlad Magdalin",
    title: "Co-Founder & Chief Innovation Officer",
    company: "Webflow",
    companyDesc: "Visual development platform for building professional websites without code.",
    employees: "1,641",
    revenue: "$213M ARR (2024)",
    funding: "$334.9M total",
    techStack: "Stripe (payments & subscriptions), freemium + paid plans",
    email: "vlad@webflow.com",
    twitter: "https://twitter.com/callmevlad",
    twitterHandle: "@callmevlad",
    linkedin: "https://www.linkedin.com/in/vladmagdalin",
    linkedinHandle: "vladmagdalin",
    fitScore: 5,
    fitReason: "$4B valuation with a large free-tier user base — strong incentive to convert free users to paid plans.",
    source: "existing",
    category: "No-Code / Website Builder",
  },
  {
    id: 3,
    name: "Emmanuel Straschnov",
    title: "Co-CEO & Co-Founder",
    company: "Bubble",
    companyDesc: "No-code platform for building web and mobile apps; $1.7–2B valuation.",
    employees: "474",
    revenue: "~$50M ARR (est.)",
    funding: "Bootstrapped (no VC)",
    techStack: "Stripe plugin ecosystem, freemium model",
    email: "emmanuel@bubblebuilder.com",
    twitter: "https://twitter.com/estraschnov",
    twitterHandle: "@estraschnov",
    linkedin: "https://www.linkedin.com/in/straschnov",
    linkedinHandle: "straschnov",
    fitScore: 4,
    fitReason: "Bootstrapped with strong freemium base — incentive-based conversion could accelerate revenue without dilution.",
    source: "existing",
    category: "No-Code / App Builder",
  },
  {
    id: 4,
    name: "David Siegel",
    title: "Founder & CEO",
    company: "Glide",
    companyDesc: "No-code app builder that turns spreadsheets into powerful apps.",
    employees: "111",
    revenue: "$3.7M ARR (2024)",
    funding: "$20.1M total",
    techStack: "Stripe (payments), freemium + 14-day business trial",
    email: "david@glideapps.com",
    twitter: "https://twitter.com/dvdsgl",
    twitterHandle: "@dvdsgl",
    linkedin: "https://www.linkedin.com/in/dvdsgl",
    linkedinHandle: "dvdsgl",
    fitScore: 4,
    fitReason: "Freemium model with 14-day trial — incentive layer could meaningfully lift trial-to-paid conversion rate.",
    source: "existing",
    category: "No-Code / App Builder",
  },
  {
    id: 5,
    name: "Spencer Fry",
    title: "Founder & CEO",
    company: "Podia",
    companyDesc: "All-in-one platform for creators to sell courses, memberships, and digital downloads.",
    employees: "35",
    revenue: "$811K ARR (2024)",
    funding: "$4.75M total",
    techStack: "Stripe (billing), freemium model",
    email: "spencer@podia.com",
    twitter: "https://twitter.com/spencerfry",
    twitterHandle: "@spencerfry",
    linkedin: "https://www.linkedin.com/in/spencerfry",
    linkedinHandle: "spencerfry",
    fitScore: 3,
    fitReason: "Creator economy platform with Stripe billing — incentive-based upgrades could boost ARPU from free creators.",
    source: "existing",
    category: "Creator Economy",
  },
  {
    id: 6,
    name: "Sahil Lavingia",
    title: "Founder & CEO",
    company: "Gumroad",
    companyDesc: "Creator commerce platform enabling direct sales of digital products and memberships.",
    employees: "~15 (AI-augmented)",
    revenue: "~$20M ARR (est.)",
    funding: "Bootstrapped",
    techStack: "Stripe (payments), freemium with revenue-share model",
    email: "sahil@gumroad.com",
    twitter: "https://twitter.com/shl",
    twitterHandle: "@shl",
    linkedin: "https://www.linkedin.com/in/sahillavingia",
    linkedinHandle: "sahillavingia",
    fitScore: 3,
    fitReason: "Large creator base on freemium — incentive to upgrade to paid tiers aligns with Gumroad's revenue-share model.",
    source: "existing",
    category: "Creator Economy",
  },
  {
    id: 7,
    name: "Justin Jackson",
    title: "Co-Founder & CEO",
    company: "Transistor.fm",
    companyDesc: "Podcast hosting and analytics platform; bootstrapped to $30K+ MRR.",
    employees: "7",
    revenue: "~$3.6M ARR (est.)",
    funding: "Bootstrapped",
    techStack: "Stripe (subscriptions), paid plans only",
    email: "justin@transistor.fm",
    twitter: "https://twitter.com/mijustin",
    twitterHandle: "@mijustin",
    linkedin: "https://www.linkedin.com/in/justinijackson",
    linkedinHandle: "justinijackson",
    fitScore: 3,
    fitReason: "Bootstrapped SaaS with Stripe subscriptions — incentive-based retention could reduce churn on annual plans.",
    source: "existing",
    category: "Podcasting",
  },
  {
    id: 8,
    name: "Nathan Barry",
    title: "Founder & CEO",
    company: "Kit (ConvertKit)",
    companyDesc: "Email-first operating system for creators; 600K+ users worldwide.",
    employees: "~90",
    revenue: "~$40M ARR (est.)",
    funding: "Bootstrapped",
    techStack: "Stripe (billing), freemium + paid plans",
    email: "nathan@kit.com",
    twitter: "https://twitter.com/nathanbarry",
    twitterHandle: "@nathanbarry",
    linkedin: "https://www.linkedin.com/in/nathanbarry",
    linkedinHandle: "nathanbarry",
    fitScore: 4,
    fitReason: "Large freemium creator base with Stripe billing — incentive-driven upgrades fit the creator monetization narrative.",
    source: "existing",
    category: "Email Marketing",
  },
  {
    id: 9,
    name: "Wes Bush",
    title: "Founder & CEO",
    company: "ProductLed",
    companyDesc: "PLG consultancy and community that has helped 400+ SaaS companies generate $1B+ in self-serve revenue.",
    employees: "~20",
    revenue: "~$5M ARR (est.)",
    funding: "Bootstrapped",
    techStack: "Stripe (subscriptions), freemium community + paid courses",
    email: "wes@productled.com",
    twitter: "https://twitter.com/wesbush",
    twitterHandle: "@wesbush",
    linkedin: "https://www.linkedin.com/in/wesbush",
    linkedinHandle: "wesbush",
    fitScore: 5,
    fitReason: "PLG expert with direct influence over 400+ SaaS companies — ideal strategic partner and early adopter/evangelist.",
    source: "existing",
    category: "PLG / Consulting",
  },
  {
    id: 10,
    name: "Ramli John",
    title: "Founder",
    company: "Delight Path",
    companyDesc: "B2B onboarding consultancy and community for product leaders; author of 'Product-Led Onboarding' (40K+ copies).",
    employees: "1–5",
    revenue: "~$500K ARR (est.)",
    funding: "Bootstrapped",
    techStack: "Stripe (subscriptions), community + consulting model",
    email: "ramli@delightpath.com",
    twitter: "https://twitter.com/RamliJohn",
    twitterHandle: "@RamliJohn",
    linkedin: "https://www.linkedin.com/in/ramlijohn",
    linkedinHandle: "ramlijohn",
    fitScore: 4,
    fitReason: "Onboarding expert with direct access to SaaS decision-makers — strong referral and partnership potential.",
    source: "existing",
    category: "PLG / Consulting",
  },
  {
    id: 11,
    name: "Tyler Denk",
    title: "Co-Founder & CEO",
    company: "beehiiv",
    companyDesc: "Newsletter platform built for growth; $50M ARR target in 2026, backed by NEA & Lightspeed.",
    employees: "~150",
    revenue: "$25M ARR (2025)",
    funding: "$49.7M total",
    techStack: "Stripe (paid subscriptions & digital products), freemium model",
    email: "tyler@beehiiv.com",
    twitter: "https://twitter.com/denk_tweets",
    twitterHandle: "@denk_tweets",
    linkedin: "https://www.linkedin.com/in/tylerdenk",
    linkedinHandle: "tylerdenk",
    fitScore: 5,
    fitReason: "Fast-growing newsletter platform with freemium model and Stripe integration — incentive layer could accelerate creator upgrades.",
    source: "existing",
    category: "Newsletter / Creator",
  },
  {
    id: 12,
    name: "Krish Subramanian",
    title: "Co-Founder & CEO",
    company: "Chargebee",
    companyDesc: "Subscription billing and revenue management platform; $3.5B valuation.",
    employees: "609",
    revenue: "$234M ARR (est.)",
    funding: "$475M total",
    techStack: "Stripe (native integration), subscription billing infrastructure",
    email: "krish@chargebee.com",
    twitter: "https://twitter.com/cbkrish",
    twitterHandle: "@cbkrish",
    linkedin: "https://www.linkedin.com/in/krishs",
    linkedinHandle: "krishs",
    fitScore: 4,
    fitReason: "Subscription billing infrastructure company — IncentivPay could be a complementary add-on for their 6,500+ customers.",
    source: "existing",
    category: "Billing Infrastructure",
  },
  {
    id: 13,
    name: "Nick Fogle",
    title: "Founder & CEO",
    company: "Churnkey",
    companyDesc: "Churn prevention platform for Stripe-powered SaaS; analyzed $3B+ in subscription revenue.",
    employees: "1–10",
    revenue: "$1.7M ARR (2025)",
    funding: "$1.82M total",
    techStack: "Stripe (native integration), churn reduction flows",
    email: "nick@churnkey.co",
    twitter: "https://twitter.com/nickfogle",
    twitterHandle: "@nickfogle",
    linkedin: "https://www.linkedin.com/in/nickfogle",
    linkedinHandle: "nickfogle",
    fitScore: 5,
    fitReason: "Churn prevention is adjacent to IncentivPay's value prop — strong partnership or integration opportunity with shared Stripe customers.",
    source: "existing",
    category: "Churn / Retention",
  },
  {
    id: 14,
    name: "Nick Franklin",
    title: "Founder & CEO",
    company: "ChartMogul",
    companyDesc: "Subscription analytics platform for Stripe and Recurly; 66 employees, recently added free trial tracking.",
    employees: "66",
    revenue: "$8M ARR (est.)",
    funding: "$3.7M total",
    techStack: "Stripe (native integration), subscription analytics",
    email: "nick@chartmogul.com",
    twitter: "https://twitter.com/nickfranklin_",
    twitterHandle: "@nickfranklin_",
    linkedin: "https://www.linkedin.com/in/nickfranklin",
    linkedinHandle: "nickfranklin",
    fitScore: 4,
    fitReason: "Subscription analytics for Stripe users — IncentivPay data (conversion lift %) would be a compelling metric in ChartMogul dashboards.",
    source: "existing",
    category: "Analytics / Billing",
  },

  // ─── NEW LINKEDIN-SOURCED PROSPECTS ──────────────────────────────────────
  {
    id: 15,
    name: "Esben Friis-Jensen",
    title: "Co-Founder & Former CGO",
    company: "Userflow",
    companyDesc: "No-code onboarding flow builder for SaaS; bootstrapped to $3.6M ARR with 3 people.",
    employees: "3–10",
    revenue: "$3.6M ARR (2025)",
    funding: "Bootstrapped",
    techStack: "Stripe (subscriptions), freemium + paid plans",
    email: "esben@userflow.com",
    twitter: "https://twitter.com/esbenfriisjensen",
    twitterHandle: "@esbenfriisjensen",
    linkedin: "https://www.linkedin.com/in/esbenfriisjensen",
    linkedinHandle: "esbenfriisjensen",
    fitScore: 4,
    fitReason: "Bootstrapped PLG SaaS with Stripe billing — incentive-based trial conversion is directly relevant to their growth model.",
    source: "linkedin",
    category: "User Onboarding",
  },
  {
    id: 16,
    name: "Kyle Poyar",
    title: "Founder",
    company: "Growth Unhinged",
    companyDesc: "Weekly newsletter on SaaS growth with 80K+ subscribers; former OpenView VP of Growth.",
    employees: "1–5",
    revenue: "~$1M ARR (est.)",
    funding: "Bootstrapped",
    techStack: "Stripe (newsletter subscriptions), Substack/Beehiiv",
    email: "kyle@growthunhinged.com",
    twitter: "https://twitter.com/poyark",
    twitterHandle: "@poyark",
    linkedin: "https://www.linkedin.com/in/kyle-poyar",
    linkedinHandle: "kyle-poyar",
    fitScore: 5,
    fitReason: "Influential SaaS growth voice with 80K+ readers — ideal for partnership, early adopter case study, and distribution.",
    source: "linkedin",
    category: "PLG / Newsletter",
  },
  {
    id: 17,
    name: "Jonas Kamber",
    title: "Founder",
    company: "Mono",
    companyDesc: "AI-powered productivity tool; built in public, hit $17K ARR in 4 weeks with 10.9% trial-to-paid conversion.",
    employees: "1",
    revenue: "$17K ARR (early stage, Feb 2026)",
    funding: "Bootstrapped",
    techStack: "Stripe (subscriptions), freemium + paid trial",
    email: "jonas@mono.app",
    twitter: "https://twitter.com/jonaskamber",
    twitterHandle: "@jonaskamber",
    linkedin: "https://www.linkedin.com/in/jonaskamber",
    linkedinHandle: "jonaskamber",
    fitScore: 5,
    fitReason: "Building in public with strong trial conversion focus — actively thinking about incentive-based conversion, perfect early adopter.",
    source: "linkedin",
    category: "AI / Productivity",
  },
  {
    id: 18,
    name: "Dan Burkhart",
    title: "Founder & CEO",
    company: "Recurly",
    companyDesc: "Subscription billing platform trusted by Twitch, CBS Interactive, and 2,000+ businesses.",
    employees: "350",
    revenue: "$61M ARR (est.)",
    funding: "$39.2M total",
    techStack: "Stripe-compatible, subscription billing infrastructure",
    email: "dan@recurly.com",
    twitter: "https://twitter.com/danburkhart",
    twitterHandle: "@danburkhart",
    linkedin: "https://www.linkedin.com/in/danburkhart",
    linkedinHandle: "danburkhart",
    fitScore: 4,
    fitReason: "Subscription billing infrastructure with 2,000+ customers — IncentivPay could be a value-add integration for their merchant base.",
    source: "linkedin",
    category: "Billing Infrastructure",
  },
  {
    id: 19,
    name: "Eric Czerwonka",
    title: "Co-Founder",
    company: "Buddy Punch",
    companyDesc: "Time tracking SaaS for SMBs; bootstrapped to $7M ARR with 10K+ customers.",
    employees: "11–50",
    revenue: "$7M ARR (est.)",
    funding: "Bootstrapped",
    techStack: "Stripe (subscriptions), freemium + paid plans",
    email: "eric@buddypunch.com",
    twitter: "https://twitter.com/ericczerwonka",
    twitterHandle: "@ericczerwonka",
    linkedin: "https://www.linkedin.com/in/ericczerwonka",
    linkedinHandle: "ericczerwonka",
    fitScore: 3,
    fitReason: "Bootstrapped SaaS with Stripe billing and SMB focus — incentive-based annual plan upgrades could improve LTV.",
    source: "linkedin",
    category: "HR / Productivity",
  },
  {
    id: 20,
    name: "Andrew Capland",
    title: "Founder",
    company: "Delivering Value",
    companyDesc: "PLG coaching and community for growth leaders; ex-Head of Growth at Postscript and Wistia.",
    employees: "1–5",
    revenue: "~$500K ARR (est.)",
    funding: "Bootstrapped",
    techStack: "Stripe (community subscriptions), cohort-based courses",
    email: "andrew@deliveringvalue.co",
    twitter: "https://twitter.com/acapland",
    twitterHandle: "@acapland",
    linkedin: "https://www.linkedin.com/in/andrewcapland",
    linkedinHandle: "andrewcapland",
    fitScore: 4,
    fitReason: "Growth coaching community with Stripe subscriptions — strong referral network among SaaS growth leaders who are IncentivPay's ICP.",
    source: "linkedin",
    category: "PLG / Coaching",
  },
  {
    id: 21,
    name: "Hiten Shah",
    title: "Co-Founder",
    company: "Nira",
    companyDesc: "Cloud document security SaaS; serial entrepreneur (co-founded KISSmetrics, Crazy Egg, FYI).",
    employees: "11–50",
    revenue: "~$5M ARR (est.)",
    funding: "$10M+ total",
    techStack: "Stripe (subscriptions), freemium + paid plans",
    email: "hiten@nira.com",
    twitter: "https://twitter.com/hnshah",
    twitterHandle: "@hnshah",
    linkedin: "https://www.linkedin.com/in/hitenshah",
    linkedinHandle: "hitenshah",
    fitScore: 4,
    fitReason: "Serial SaaS entrepreneur with deep Stripe billing experience across multiple companies — strong strategic advisor and early adopter potential.",
    source: "linkedin",
    category: "SaaS / Security",
  },
  {
    id: 22,
    name: "Lenny Rachitsky",
    title: "Founder",
    company: "Lenny's Newsletter",
    companyDesc: "Top product & growth newsletter with 700K+ subscribers; ex-Airbnb PM lead.",
    employees: "1–5",
    revenue: "~$5M ARR (est.)",
    funding: "Bootstrapped",
    techStack: "Stripe (paid subscriptions via Substack), freemium newsletter",
    email: "lenny@lennysnewsletter.com",
    twitter: "https://twitter.com/lennysan",
    twitterHandle: "@lennysan",
    linkedin: "https://www.linkedin.com/in/lennyrachitsky",
    linkedinHandle: "lennyrachitsky",
    fitScore: 5,
    fitReason: "700K+ subscribers with Stripe-powered paid tier — massive distribution opportunity and credibility boost if IncentivPay is featured.",
    source: "linkedin",
    category: "Newsletter / PLG",
  },
];

const fitColors: Record<number, string> = {
  5: "bg-emerald-100 text-emerald-800 border-emerald-200",
  4: "bg-blue-100 text-blue-800 border-blue-200",
  3: "bg-amber-100 text-amber-800 border-amber-200",
  2: "bg-gray-100 text-gray-600 border-gray-200",
  1: "bg-red-100 text-red-700 border-red-200",
};

const fitLabels: Record<number, string> = {
  5: "Top Fit",
  4: "Strong Fit",
  3: "Good Fit",
  2: "Moderate",
  1: "Low Fit",
};

const categoryColors: Record<string, string> = {
  "Scheduling": "bg-violet-50 text-violet-700",
  "No-Code / Website Builder": "bg-blue-50 text-blue-700",
  "No-Code / App Builder": "bg-indigo-50 text-indigo-700",
  "Creator Economy": "bg-pink-50 text-pink-700",
  "Podcasting": "bg-orange-50 text-orange-700",
  "Email Marketing": "bg-yellow-50 text-yellow-700",
  "PLG / Consulting": "bg-teal-50 text-teal-700",
  "PLG / Newsletter": "bg-teal-50 text-teal-700",
  "PLG / Coaching": "bg-teal-50 text-teal-700",
  "Newsletter / Creator": "bg-pink-50 text-pink-700",
  "Newsletter / PLG": "bg-pink-50 text-pink-700",
  "Billing Infrastructure": "bg-slate-50 text-slate-700",
  "Churn / Retention": "bg-red-50 text-red-700",
  "Analytics / Billing": "bg-cyan-50 text-cyan-700",
  "User Onboarding": "bg-emerald-50 text-emerald-700",
  "AI / Productivity": "bg-purple-50 text-purple-700",
  "HR / Productivity": "bg-gray-50 text-gray-700",
  "SaaS / Security": "bg-slate-50 text-slate-700",
};

export default function MerchantProspects() {
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState<"all" | "existing" | "linkedin">("all");
  const [filterFit, setFilterFit] = useState<"all" | "5" | "4" | "3">("all");

  const filtered = prospects.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.company.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q);
    const matchSource = filterSource === "all" || p.source === filterSource;
    const matchFit = filterFit === "all" || p.fitScore === Number(filterFit);
    return matchSearch && matchSource && matchFit;
  });

  const topFit = prospects.filter((p) => p.fitScore === 5).length;
  const newProspects = prospects.filter((p) => p.source === "linkedin").length;

  return (
    <AuthGuard role="admin">
    <MerchantLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach Prospects</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {prospects.length} prospects · {topFit} top-fit · {newProspects} new from LinkedIn
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{prospects.length}</p>
            <p className="text-xs text-gray-500">Total Prospects</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
            <Star className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{topFit}</p>
            <p className="text-xs text-gray-500">Top Fit (Score 5)</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500 flex items-center justify-center">
            <Linkedin className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{newProspects}</p>
            <p className="text-xs text-gray-500">New from LinkedIn</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">$1B+</p>
            <p className="text-xs text-gray-500">Combined ARR</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, company, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          {(["all", "existing", "linkedin"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSource(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterSource === s
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s === "all" ? "All Sources" : s === "existing" ? "Existing" : "New (LinkedIn)"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {(["all", "5", "4", "3"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterFit(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterFit === f
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? "All Scores" : `Score ${f}`}
            </button>
          ))}
        </div>
      </div>

      {/* Prospect cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No prospects match your filters.</div>
        )}
        {filtered.map((p) => (
          <div
            key={p.id}
            className={`bg-white rounded-xl border p-5 transition-all hover:shadow-sm ${
              p.source === "linkedin" ? "border-violet-200 bg-violet-50/30" : "border-gray-200"
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">
                  {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </span>
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-sm">{p.name}</h3>
                      <span className="text-gray-400 text-xs">·</span>
                      <span className="text-gray-600 text-xs">{p.title}</span>
                      {p.source === "linkedin" && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 border-violet-200 font-medium">
                          New · LinkedIn
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3 h-3 text-gray-400" />
                      <span className="text-sm font-medium text-gray-800">{p.company}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${categoryColors[p.category] ?? "bg-gray-50 text-gray-600"}`}>
                        {p.category}
                      </span>
                    </div>
                  </div>

                  {/* Fit score */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${fitColors[p.fitScore]}`}>
                    <Star className="w-3 h-3" />
                    {fitLabels[p.fitScore]}
                  </div>
                </div>

                {/* Company description */}
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{p.companyDesc}</p>

                {/* Metrics row */}
                <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Users className="w-3 h-3 text-gray-400" />
                    <span>{p.employees} employees</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <DollarSign className="w-3 h-3 text-gray-400" />
                    <span>{p.revenue}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Funding: <span className="text-gray-600">{p.funding}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Stack: <span className="text-gray-600">{p.techStack}</span>
                  </div>
                </div>

                {/* Fit reason */}
                <div className="mt-2.5 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-emerald-800">
                    <span className="font-semibold">Why IncentivPay fits: </span>
                    {p.fitReason}
                  </p>
                </div>

                {/* Contact row */}
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  {p.email && (
                    <a
                      href={`mailto:${p.email}`}
                      className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-emerald-700 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {p.email}
                    </a>
                  )}
                  {p.twitter && (
                    <a
                      href={p.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-sky-600 transition-colors"
                    >
                      <Twitter className="w-3.5 h-3.5" />
                      {p.twitterHandle}
                    </a>
                  )}
                  {p.linkedin && (
                    <a
                      href={p.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-700 transition-colors"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      {p.linkedinHandle}
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(p.name + " " + p.company)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors ml-auto"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Research
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </MerchantLayout>
    </AuthGuard>
  );
}
