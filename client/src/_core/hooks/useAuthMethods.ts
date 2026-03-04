import { useEffect, useState } from "react";

type AuthMethods = { oauth: boolean; simpleLogin: boolean };

export function useAuthMethods(): {
  oauth: boolean;
  simpleLogin: boolean;
  loading: boolean;
} {
  const [data, setData] = useState<AuthMethods | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/methods")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData({ oauth: false, simpleLogin: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    oauth: data?.oauth ?? false,
    simpleLogin: data?.simpleLogin ?? false,
    loading,
  };
}
