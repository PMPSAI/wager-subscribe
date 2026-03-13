/**
 * WagerSubscribe Embeddable Widget
 *
 * Supports:
 * - /widget (default demo)
 * - /widget/:merchantSlug (merchant-specific)
 * - Anonymous tracking via localStorage tokens
 * - Member signup (email-based, no password required)
 *
 * Flow: Choose Plan → Pay (Stripe embedded) → Predict → Track
 */
import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";
import {
  Zap, Trophy, TrendingUp, Shield, ArrowRight, CheckCircle2,
  CreditCard, Target, Clock, Star, Crown, Rocket, User, Loader2
} from "lucide-react";

const TIER_CONFIG = {
  starter: { icon: Rocket, color: "blue", label: "Starter", price: "$9/mo" },
  pro: { icon: TrendingUp, color: "violet", label: "Pro", price: "$29/mo" },
  elite: { icon: Crown, color: "amber", label: "Elite", price: "$79/mo" },
};

type Step = "plan" | "pay" | "prediction" | "tracking";

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

interface PayStepProps {
  selectedTier: "starter" | "pro" | "elite" | null;
  effectiveSlug: string;
  embedToken?: string;
  merchantSlug?: string;
  isAuthenticated: boolean;
  authLoading: boolean;
  stripePublishableKey?: string;
  createEmbeddedCheckout: ReturnType<typeof trpc.subscription.createEmbeddedCheckoutSession.useMutation>;
  createEmbeddedCheckoutGuest: ReturnType<typeof trpc.subscription.createEmbeddedCheckoutSessionGuest.useMutation>;
  navigate: (path: string) => void;
}

function PayStep({
  selectedTier,
  effectiveSlug,
  embedToken,
  isAuthenticated,
  authLoading,
  stripePublishableKey,
  createEmbeddedCheckout,
  createEmbeddedCheckoutGuest,
  navigate,
}: PayStepProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [guestCheckoutStarted, setGuestCheckoutStarted] = useState(false);

  const basePath = effectiveSlug !== "wager-demo" ? `/widget/${effectiveSlug}` : "/widget";
  const returnUrlPath = embedToken ? `${basePath}?token=${embedToken}` : basePath;
  const redirectWithTier = embedToken
    ? `${basePath}?token=${embedToken}&tier=${selectedTier || "pro"}`
    : `${basePath}?tier=${selectedTier || "pro"}`;

  // Authenticated: create embedded session
  useEffect(() => {
    if (!selectedTier || !isAuthenticated || !stripePublishableKey || clientSecret || createEmbeddedCheckout.isPending) return;
    createEmbeddedCheckout.mutate(
      {
        planTier: selectedTier,
        merchantSlug: effectiveSlug === "wager-demo" ? undefined : effectiveSlug,
        returnUrlPath,
      },
      {
        onSuccess: (data: { clientSecret?: string }) => {
          if (data?.clientSecret) setClientSecret(data.clientSecret);
        },
        onError: (err: { message?: string }) => toast.error(err.message || "Failed to start checkout"),
      }
    );
  }, [selectedTier, isAuthenticated, stripePublishableKey, effectiveSlug, embedToken, returnUrlPath]);

  // Guest: create embedded session when user clicks Continue as guest
  const handleGuestCheckout = () => {
    if (!selectedTier || !stripePublishableKey) return;
    setGuestCheckoutStarted(true);
    createEmbeddedCheckoutGuest.mutate(
      {
        planTier: selectedTier,
        merchantSlug: effectiveSlug === "wager-demo" ? undefined : effectiveSlug,
        returnUrlPath,
      },
      {
        onSuccess: (data: { clientSecret?: string }) => {
          if (data?.clientSecret) setClientSecret(data.clientSecret);
        },
        onError: (err: { message?: string }) => {
          toast.error(err.message || "Failed to start checkout");
          setGuestCheckoutStarted(false);
        },
      }
    );
  };

  if (authLoading && !guestCheckoutStarted) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated: show Sign in / Sign up / Continue as guest
  if (!isAuthenticated && !guestCheckoutStarted) {
    const authRedirectLogin = `/auth?redirect=${encodeURIComponent(redirectWithTier)}`;
    const authRedirectSignup = `/auth?redirect=${encodeURIComponent(redirectWithTier)}&mode=signup`;
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Complete your payment</h2>
          <p className="text-gray-500 mb-6">
            Sign in to your account, create one, or continue as a guest.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(authRedirectLogin)}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate(authRedirectSignup)}
              className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl"
            >
              Create account
            </button>
            <button
              onClick={handleGuestCheckout}
              disabled={!stripePublishableKey}
              className="w-full px-6 py-3 border-2 border-gray-200 hover:border-gray-300 text-gray-600 font-semibold rounded-xl"
            >
              Continue as guest
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stripePublishableKey) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Checkout unavailable</h2>
          <p className="text-gray-500">Stripe is not configured for this merchant.</p>
        </div>
      </div>
    );
  }

  const checkoutPending = createEmbeddedCheckout.isPending || createEmbeddedCheckoutGuest.isPending;
  if (checkoutPending || !clientSecret) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Preparing checkout</h2>
          <p className="text-gray-500">Loading secure payment form...</p>
        </div>
      </div>
    );
  }

  const stripePromise = loadStripe(stripePublishableKey);
  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Complete your payment</h2>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}

interface WidgetProps {
  merchantSlug?: string;
}

export default function Widget({ merchantSlug }: WidgetProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
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
  const stripePublishableKey = plansData?.stripePublishableKey as string | undefined;
  const createEmbeddedCheckout = trpc.subscription.createEmbeddedCheckoutSession.useMutation();
  const createEmbeddedCheckoutGuest = trpc.subscription.createEmbeddedCheckoutSessionGuest.useMutation();
  const { data: enabledMarkets } = trpc.markets.listEnabled.useQuery();
  const memberSignup = trpc.member.signup.useMutation();
  const recordPrediction = trpc.intent.recordPrediction.useMutation();
  const memberVerify = trpc.member.verify.useQuery(
    { sessionToken: memberToken ?? "" },
    { enabled: !!memberToken }
  );

  // Restore Pay step when returning from auth (tier in URL)
  const tierFromUrl = urlParams.get("tier") as "starter" | "pro" | "elite" | null;
  useEffect(() => {
    if (tierFromUrl && ["starter", "pro", "elite"].includes(tierFromUrl)) {
      setSelectedTier(tierFromUrl);
      setStep("pay");
    }
  }, [tierFromUrl]);

  // If returning from Stripe checkout, skip to prediction
  useEffect(() => {
    if (sessionId) {
      setStep("prediction");
    }
  }, [sessionId]);

  // Restore Pay step from URL when returning from auth (redirect preserves tier)
  useEffect(() => {
    const tierFromUrl = urlParams.get("tier");
    if (tierFromUrl && ["starter", "pro", "elite"].includes(tierFromUrl)) {
      setSelectedTier(tierFromUrl as "starter" | "pro" | "elite");
      setStep("pay");
    }
  }, [search]);

  // If member already has a token, skip auth
  useEffect(() => {
    if (memberToken && memberVerify.data?.valid) {
      // Already authenticated as member
    }
  }, [memberToken, memberVerify.data]);

  const handleSelectPlan = (tier: "starter" | "pro" | "elite") => {
    setSelectedTier(tier);
    setStep("pay");
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
          {(["plan", "pay", "prediction", "tracking"] as Step[]).map((s, i) => {
            const stepLabels: Record<Step, string> = {
              "plan": "Choose Plan",
              "pay": "Pay",
              "prediction": "Predict",
              "tracking": "Track"
            };
            const stepOrder: Step[] = ["plan", "pay", "prediction", "tracking"];
            const stepIndex = stepOrder.indexOf(step);
            const thisIndex = stepOrder.indexOf(s);
            const isDone = thisIndex < stepIndex;
            const isCurrent = s === step;
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
                          <p className="text-2xl font-bold text-gray-900">${String(Math.round(plan.amountCents * 0.01))}<span className="text-sm font-normal text-gray-400">{" per month"}</span></p>
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
                        Subscribe & Pay
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

        {/* Step: Pay (embedded Stripe checkout in widget) */}
        {step === "pay" && (
          <PayStep
            selectedTier={selectedTier}
            effectiveSlug={effectiveSlug}
            embedToken={embedToken ?? undefined}
            merchantSlug={merchantSlug}
            isAuthenticated={isAuthenticated}
            authLoading={authLoading}
            stripePublishableKey={stripePublishableKey}
            createEmbeddedCheckout={createEmbeddedCheckout}
            createEmbeddedCheckoutGuest={createEmbeddedCheckoutGuest}
            navigate={navigate}
          />
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
              <div className="mt-6 space-y-4">
                {!memberToken && (
                  <div className="max-w-md mx-auto bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Optional: Enter email to save your prediction</p>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!memberEmail) return;
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
                            toast.success("Account created! Your prediction will be saved.");
                          }
                        } catch (err: any) {
                          toast.error(err.message || "Signup failed");
                        } finally {
                          setSigningUp(false);
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="email"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                      />
                      <button type="submit" disabled={signingUp || !memberEmail} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                        {signingUp ? "..." : "Save"}
                      </button>
                    </form>
                    <p className="text-xs text-gray-500 mt-2">Or skip to proceed without saving</p>
                  </div>
                )}
                <div className="text-center">
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
                {(memberVerify.data?.member?.email || memberEmail)
                  ? ` Updates will be sent to ${memberVerify.data?.member?.email || memberEmail}.`
                  : ""}
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
