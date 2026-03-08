import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function MerchantSignup() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    merchantName: "",
    phone: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          merchantName: form.merchantName || undefined,
          phone: form.phone || undefined,
          role: "admin",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Signup failed");
        return;
      }
      toast.success("Account created! Redirecting...");
      setTimeout(() => navigate("/merchant"), 1000);
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
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
      if (!res.ok) {
        toast.error(data.error || "Login failed");
        return;
      }
      toast.success("Logged in! Redirecting...");
      setTimeout(() => navigate("/merchant"), 1000);
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold text-yellow-400">WagerSubscribe</a>
          <p className="text-gray-400 mt-2 text-sm">Merchant Portal</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
          {/* Tab Switch */}
          <div className="flex rounded-lg bg-gray-800 p-1 mb-6">
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "signup" ? "bg-yellow-400 text-gray-900" : "text-gray-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "login" ? "bg-yellow-400 text-gray-900" : "text-gray-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
          </div>

          {mode === "signup" ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">First Name</label>
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Last Name</label>
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Business Name (optional)</label>
                <input
                  name="merchantName"
                  value={form.merchantName}
                  onChange={handleChange}
                  placeholder="Acme Corp"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Email Address *</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Phone (optional)</label>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+1 555 000 0000"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Password *</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Confirm Password *</label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 font-bold rounded-lg transition-colors"
              >
                {loading ? "Creating Account..." : "Create Merchant Account"}
              </button>

              <p className="text-xs text-gray-500 text-center">
                By signing up you agree to our{" "}
                <a href="/terms" className="text-yellow-400 hover:underline">Terms of Service</a>.
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Your password"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 font-bold rounded-lg transition-colors"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>

              <div className="text-center">
                <a href="/api/simple-login" className="text-xs text-gray-500 hover:text-gray-300">
                  Use demo login instead
                </a>
              </div>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-300">← Back to Home</a>
        </div>
      </div>
    </div>
  );
}
