/**
 * WagerSubscribe Embeddable Widget
 * 
 * Supports:
 * - /widget (default demo)
 * - /widget/:merchantSlug (merchant-specific)
 * - Anonymous tracking via localStorage tokens
 * - Member signup (email-based, no password required)
 * 
 * Flow: Select Plan → Member Auth → Prediction → Track & Earn
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";
import {
  Zap, Trophy, TrendingUp, Shield, ArrowRight, CheckCircle2,
  CreditCard, Target, Clock, Star, Crown, Rocket, Lock, User, Mail
} from "lucide-react";

const TIER_CONFIG = {
  starter: { icon: Rocket, color: "blue", label: "Starter", price: "$9/mo" },
  pro: { icon: TrendingUp, color: "violet", label: "Pro", price: "$29/mo" },
  elite: { icon: Crown, color: "amber", label: "Elite", price: "$79/mo" },
};

type Step = "plan" | "member-auth" | "prediction" | "tracking";

const ANON_TOKEN_KEY = "ws_anon_token";
const MEMBER_TOKEN_KEY = "ws_member_token";
const MEMBER_ID_KEY = "ws_member_id";

function getAnonToken(): string {
  let token = localStorage.getItem(ANON_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(ANON_TOKEN_KEY, token);
  }
  return token;
}

interface WidgetProps {
  merchantSlug?: string;
}

export default function Widget({ merchantSlug }: WidgetProps) {
  const [, navigate] = useLocation();
  const search = useSearch();
  const urlParams = new URLSearchParams(search);
  const sessionId = urlParams.get("session_id");
  const slugParam = urlParams.get("slug");
  const embedToken = urlParams.get("token");

  // Resolve merchant slug: prop > URL slug > embed token (verify returns slug) > demo
  const { data: embedVerify, isFetched: embedVerifyFetched } = trpc.merchant.verifyEmbedToken.useQuery(
    { token: embedToken ?? "" },
    { enabled: !!embedToken }
  );
  const slugFromToken = embedVerify?.valid ? embedVerify.merchantSlug : undefined;
  const effectiveSlug = merchantSlug || slugParam || slugFromToken || "wager-demo";

  // When token is present, wait for verification before fetching plans so we show merchant prices
  const plansReady = !embedToken || embedVerifyFetched;

  const [step, setStep] = useState<Step>("plan");
  const [selectedTier, setSelectedTier] = useState<"starter" | "pro" | "elite" | null>(null);
  const [anonToken] = useState(getAnonToken);
  const [memberToken, setMemberToken] = useState<string | null>(() => localStorage.getItem(MEMBER_TOKEN_KEY));
  const [memberId, setMemberId] = useState<number | null>(() => {
    const v = localStorage.getItem(MEMBER_ID_KEY);
    return v ? parseInt(v) : null;
  });
  const [memberEmail, setMemberEmail] = useState("");
  const [memberFirstName, setMemberFirstName] = useState("");
  const [memberLastName, setMemberLastName] = useState("");
  const [signingUp, setSigningUp] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [userChoice, setUserChoice] = useState<"yes" | "no" | null>(null);

  const { data: plansData, isLoading: plansLoading } = trpc.subscription.plans.useQuery(
    { merchantSlug: effectiveSlug === "wager-demo" ? undefined : effectiveSlug },
    { enabled: plansReady }
  );
  const plans = plansData?.plans;
  const { data: enabledMarkets } = trpc.markets.listEnabled.useQuery();
  const memberSignup = trpc.member.signup.useMutation();
  const recordPrediction = trpc.intent.recordPrediction.useMutation();
  const memberVerify = trpc.member.verify.useQuery(
    { sessionToken: memberToken ?? "" },
    { enabled: !!memberToken }
  );

  // If returning from Stripe checkout, skip to prediction
  useEffect(() => {
    if (sessionId) {
      setStep("prediction");
    }
  }, [sessionId]);

  // If member already has a token, skip auth
  useEffect(() => {
    if (memberToken && memberVerify.data?.valid) {
      // Already authenticated as member
    }
  }, [memberToken, memberVerify.data]);

  const handleSelectPlan = (tier: "starter" | "pro" | "elite") => {
    setSelectedTier(tier);
    if (!memberToken) {
      setStep("member-auth");
    } else {
      // Already a member, go to checkout
      handleCheckout(tier);
    }
  };

  const handleCheckout = (tier: "starter" | "pro" | "elite") => {
    const params = `tier=${tier}&slug=${effectiveSlug}&anon=${anonToken}`;
    const plansPath = `/plans?${params}`;
    // In iframe: use full URL so we stay in the app (or break out if cross-origin)
    if (window.top !== window.self) {
      const baseUrl = (import.meta.env.VITE_APP_URL as string) || window.location.origin;
      window.location.href = `${baseUrl}${plansPath}`;
    } else {
      // Same tab: use client-side navigation to avoid full reload / wrong redirect
      navigate(plansPath);
    }
  };

  const handleMemberSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail) {
      toast.error("Email is required");
      return;
    }
    setSigningUp(true);
    try {
      const result = await memberSignup.mutateAsync({
        merchantSlug: effectiveSlug,
        email: memberEmail,
        firstName: memberFirstName || undefined,
        lastName: memberLastName || undefined,
        anonToken,
      });
      if (result.sessionToken) {
        localStorage.setItem(MEMBER_TOKEN_KEY, result.sessionToken);
        localStorage.setItem(MEMBER_ID_KEY, String(result.memberId));
        setMemberToken(result.sessionToken);
        setMemberId(result.memberId ?? null);
        toast.success(result.isNew ? "Welcome! Account created." : "Welcome back!");
        // Now proceed to checkout
        if (selectedTier) handleCheckout(selectedTier);
      }
    } catch (e: any) {
      toast.error(e.message || "Signup failed");
    } finally {
      setSigningUp(false);
    }
  };

  const handleSkipAuth = () => {
    // Allow anonymous users to proceed
    if (selectedTier) handleCheckout(selectedTier);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Zap size={14} className="text-white" fill="currentColor" />
            </div>
            <span className="font-bold text-gray-900">WagerSubscribe</span>
            {effectiveSlug && effectiveSlug !== "wager-demo" && (
              <span className="text-xs text-gray-400 ml-1">· {effectiveSlug}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <a href="/plans" className="text-gray-500 hover:text-gray-900">Plans</a>
            <a href="/merchant/signup" className="text-gray-500 hover:text-gray-900">Merchants</a>
            {memberToken && memberVerify.data?.valid && (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <User size={13} /> {memberVerify.data.member.email?.split("@")[0]}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          {(["plan", "member-auth", "prediction", "tracking"] as Step[]).map((s, i) => {
            const stepLabels: Record<Step, string> = {
              "plan": "Choose Plan",
              "member-auth": "Quick Sign Up",
              "prediction": "Pick Prediction",
              "tracking": "Track & Earn"
            };
            const stepOrder: Step[] = ["plan", "member-auth", "prediction", "tracking"];
            const stepIndex = stepOrder.indexOf(step);
            const thisIndex = stepOrder.indexOf(s);
            const isDone = thisIndex < stepIndex;
            const isCurrent = s === step;
            if (s === "member-auth" && memberToken) return null;
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className={`w-8 h-0.5 ${isDone ? "bg-emerald-500" : "bg-gray-200"}`} />}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isCurrent ? "bg-emerald-600 text-white" :
                  isDone ? "bg-emerald-100 text-emerald-700" :
                  "bg-gray-100 text-gray-400"
                }`}>
                  {isDone && <CheckCircle2 size={12} />}
                  {stepLabels[s]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Step: Choose Plan */}
        {step === "plan" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscribe & Place Your Prediction</h1>
              <p className="text-gray-500 max-w-xl mx-auto">
                Choose a subscription plan. If your prediction comes true within 30 days, you earn subscription credits — up to 24 months free.
              </p>
            </div>
            {plansLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1,2,3].map(i => <div key={i} className="h-64 bg-white rounded-2xl border animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans?.map((plan) => {
                  const cfg = TIER_CONFIG[plan.tier];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={plan.tier}
                      className={`relative bg-white rounded-2xl border-2 p-6 cursor-pointer transition-all hover:shadow-lg ${
                        plan.popular ? "border-violet-400 shadow-md" : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleSelectPlan(plan.tier)}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="bg-violet-600 text-white text-xs px-3 py-1 rounded-full font-medium">Most Popular</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          plan.tier === "starter" ? "bg-blue-100" :
                          plan.tier === "pro" ? "bg-violet-100" : "bg-amber-100"
                        }`}>
                          <Icon size={20} className={
                            plan.tier === "starter" ? "text-blue-600" :
                            plan.tier === "pro" ? "text-violet-600" : "text-amber-600"
                          } />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{plan.name}</p>
                          <p className="text-2xl font-bold text-gray-900">${(plan.amountCents / 100).toFixed(0)}<span className="text-sm font-normal text-gray-400">/mo</span></p>
                        </div>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy size={14} className="text-emerald-600" />
                          <span className="text-xs font-semibold text-emerald-700">Win Reward</span>
                        </div>
                        <p className="text-sm font-bold text-emerald-800">{plan.rewardDescription}</p>
                      </div>
                      <ul className="space-y-2 mb-6">
                        {plan.features.slice(0, 3).map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        className={`w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                          plan.popular
                            ? "bg-violet-600 hover:bg-violet-700 text-white"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                        onClick={(e) => { e.stopPropagation(); handleSelectPlan(plan.tier); }}
                      >
                        <CreditCard size={14} />
                        Subscribe & Predict
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-400">
              <div className="flex items-center gap-1.5"><Shield size={14} /> Secured by Stripe</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Cancel anytime</div>
              <div className="flex items-center gap-1.5"><Trophy size={14} /> Real cash rewards</div>
            </div>
          </div>
        )}

        {/* Step: Member Auth */}
        {step === "member-auth" && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mail size={24} className="text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Quick Sign Up</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Enter your email to track your prediction and receive updates.
                </p>
              </div>

              <form onSubmit={handleMemberSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">First Name</label>
                    <input
                      type="text"
                      value={memberFirstName}
                      onChange={e => setMemberFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={memberLastName}
                      onChange={e => setMemberLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={e => setMemberEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={signingUp}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                >
                  {signingUp ? "Setting up..." : "Continue to Checkout →"}
                </button>

                <button
                  type="button"
                  onClick={handleSkipAuth}
                  className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip for now (anonymous)
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Step: Pick Prediction */}
        {step === "prediction" && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pick Your Prediction</h2>
              <p className="text-gray-500">Choose a market to predict. If you're right, you earn free subscription months.</p>
            </div>

            {enabledMarkets && enabledMarkets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enabledMarkets.map((m: any) => (
                  <div
                    key={m.id}
                    onClick={() => { setSelectedCondition(String(m.id)); setUserChoice(null); }}
                    className={`bg-white rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-md ${
                      selectedCondition === String(m.id) ? "border-emerald-500 shadow-md" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.source === "polymarket" ? "bg-blue-100 text-blue-700" :
                        m.source === "kalshi" ? "bg-purple-100 text-purple-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {m.source}
                      </span>
                      {m.yesPrice && (
                        <span className="text-sm font-bold text-emerald-600">
                          Yes: {(parseFloat(m.yesPrice) * 100).toFixed(0)}¢
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 leading-snug">{m.title}</h3>
                    {m.resolutionDate && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={11} />
                        Resolves {new Date(m.resolutionDate).toLocaleDateString()}
                      </div>
                    )}
                    {selectedCondition === String(m.id) && (
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setUserChoice("yes"); }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            userChoice === "yes" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setUserChoice("no"); }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            userChoice === "no" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          }`}
                        >
                          No
                        </button>
                        {userChoice && <CheckCircle2 size={14} className="text-emerald-600" />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                <Target size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No prediction markets available yet.</p>
                <p className="text-gray-400 text-sm mt-1">Check back soon — markets are updated regularly.</p>
              </div>
            )}

            {selectedCondition && (
              <div className="mt-6 text-center">
                <button
                  onClick={async () => {
                    const marketId = parseInt(selectedCondition, 10);
                    if (memberToken && userChoice) {
                      try {
                        await recordPrediction.mutateAsync({
                          sessionToken: memberToken,
                          predictionMarketId: marketId,
                          userChoice,
                        });
                        toast.success("Prediction saved!");
                      } catch (e: any) {
                        toast.error(e.message || "Failed to save prediction");
                        return;
                      }
                    } else if (!memberToken) {
                      toast("Sign up to save your prediction to your account", { type: "info" });
                    }
                    setStep("tracking");
                  }}
                  disabled={!userChoice || recordPrediction.isPending}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
                >
                  {recordPrediction.isPending ? "Saving..." : "Confirm Prediction"} <ArrowRight size={16} />
                </button>
                {!userChoice && (
                  <p className="text-sm text-amber-600 mt-2">Select Yes or No above to confirm</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Tracking */}
        {step === "tracking" && (
          <div className="max-w-lg mx-auto text-center">
            <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy size={28} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You're All Set!</h2>
              <p className="text-gray-500 mb-6">
                Your prediction is being tracked. We'll notify you when it resolves.
                {memberEmail && ` Updates will be sent to ${memberEmail}.`}
              </p>
              <div className="bg-emerald-50 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Star size={16} className="text-emerald-600" />
                  <span className="font-semibold text-emerald-800 text-sm">How Rewards Work</span>
                </div>
                <ul className="space-y-1.5 text-sm text-emerald-700">
                  <li className="flex items-start gap-2"><CheckCircle2 size={13} className="mt-0.5 shrink-0" /> Prediction resolves within 30 days</li>
                  <li className="flex items-start gap-2"><CheckCircle2 size={13} className="mt-0.5 shrink-0" /> If correct, earn free subscription months</li>
                  <li className="flex items-start gap-2"><CheckCircle2 size={13} className="mt-0.5 shrink-0" /> Credits applied automatically</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <a href="/dashboard" className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition-colors text-center">
                  View Dashboard
                </a>
                <button
                  onClick={() => setStep("plan")}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition-colors"
                >
                  Add Another
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
