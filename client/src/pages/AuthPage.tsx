/**
 * AuthPage — unified login / signup page used by all roles (admin, merchant, user).
 * Matches the app's light theme (white/gray, primary emerald).
 * Accepts an optional `defaultMode` prop and a `redirectTo` query param.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Zap, Eye, EyeOff, ArrowRight, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface AuthPageProps {
  defaultMode?: "login" | "signup";
  /** Where to redirect after successful auth. Defaults to "/" */
  redirectTo?: string;
}

export default function AuthPage({ defaultMode = "login", redirectTo }: AuthPageProps) {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const modeFromUrl = searchParams.get("mode");
  const [mode, setMode] = useState<"login" | "signup">(
    modeFromUrl === "signup" ? "signup" : defaultMode
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    merchantName: "",
    phone: "",
    role: "user" as "user" | "admin",
  });

  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const destination = redirectTo ?? searchParams.get("redirect") ?? "/";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const afterAuth = () => {
    utils.auth.me.invalidate();
    navigate(destination);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error("Passwords do not match"); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          merchantName: form.role === "admin" ? (form.merchantName || undefined) : undefined,
          phone: form.phone || undefined,
          role: form.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Signup failed"); return; }
      toast.success("Account created! Redirecting...");
      setTimeout(afterAuth, 800);
    } catch { toast.error("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Login failed"); return; }
      toast.success("Signed in! Redirecting...");
      setTimeout(afterAuth, 800);
    } catch { toast.error("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap size={16} className="text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-bold text-foreground text-lg">IncentivPay</span>
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                <span>Don't have an account?</span>
                <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">Sign up</button>
              </>
            ) : (
              <>
                <span>Already have an account?</span>
                <button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">Sign in</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              {mode === "login"
                ? <LogIn size={22} className="text-primary" />
                : <UserPlus size={22} className="text-primary" />}
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {mode === "login"
                ? "Sign in to your IncentivPay account"
                : "Join IncentivPay and start earning subscription credits"}
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
                  <input
                    name="email" type="email" value={form.email} onChange={handleChange}
                    placeholder="you@example.com" required autoComplete="email"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange}
                      placeholder="Your password" required autoComplete="current-password"
                      className="w-full border border-border rounded-lg px-3 py-2.5 pr-10 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full gap-2 font-semibold" size="lg">
                  {loading ? "Signing in..." : <><LogIn size={16} /> Sign In</>}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                {/* Account type */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Account type</label>
                  <select
                    name="role" value={form.role} onChange={handleChange}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    <option value="user">Subscriber (personal account)</option>
                    <option value="admin">Merchant (business account)</option>
                  </select>
                </div>
                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">First name</label>
                    <input
                      name="firstName" type="text" value={form.firstName} onChange={handleChange}
                      placeholder="Jane" autoComplete="given-name"
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Last name</label>
                    <input
                      name="lastName" type="text" value={form.lastName} onChange={handleChange}
                      placeholder="Smith" autoComplete="family-name"
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                  </div>
                </div>
                {/* Merchant name (admin only) */}
                {form.role === "admin" && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Business name</label>
                    <input
                      name="merchantName" type="text" value={form.merchantName} onChange={handleChange}
                      placeholder="Acme Sports Betting"
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email address <span className="text-destructive">*</span></label>
                  <input
                    name="email" type="email" value={form.email} onChange={handleChange}
                    placeholder="you@example.com" required autoComplete="email"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Password <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <input
                      name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange}
                      placeholder="Min. 8 characters" required autoComplete="new-password"
                      className="w-full border border-border rounded-lg px-3 py-2.5 pr-10 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Confirm password <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <input
                      name="confirmPassword" type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={handleChange}
                      placeholder="Repeat password" required autoComplete="new-password"
                      className="w-full border border-border rounded-lg px-3 py-2.5 pr-10 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full gap-2 font-semibold" size="lg">
                  {loading ? "Creating account..." : <><UserPlus size={16} /> Create Account</>}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  By signing up you agree to our{" "}
                  <a href="/terms" className="text-primary hover:underline">Terms of Service</a>.
                </p>
              </form>
            )}

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
            </div>

            {/* Toggle mode */}
            <div className="text-center text-sm">
              {mode === "login" ? (
                <p className="text-muted-foreground">
                  New to IncentivPay?{" "}
                  <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">Create an account</button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Already have an account?{" "}
                  <button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">Sign in</button>
                </p>
              )}
            </div>
          </div>

          <p className="text-center mt-6">
            <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto">
              <ArrowRight size={13} className="rotate-180" /> Back to Home
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
