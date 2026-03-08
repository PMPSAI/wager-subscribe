/**
 * AuthGuard — wraps a page and redirects to /auth if not authenticated.
 * Optionally checks for a required role (e.g. "admin").
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Zap } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  /** If set, user must have this role or be redirected. */
  role?: "admin" | "user";
  /** Where to redirect if auth fails. Defaults to /auth */
  redirectTo?: string;
}

export default function AuthGuard({ children, role, redirectTo = "/auth" }: AuthGuardProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate(`${redirectTo}?redirect=${encodeURIComponent(location)}`);
      return;
    }
    if (role && user?.role !== role) {
      navigate("/");
    }
  }, [loading, isAuthenticated, user, role, location, navigate, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Zap size={20} className="text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (role && user?.role !== role) return null;

  return <>{children}</>;
}
