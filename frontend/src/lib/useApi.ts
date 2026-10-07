import { useCallback, useEffect, useRef, useState } from "react";
import { api, errMessage } from "@/lib/api";

export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T>(path);
      if (mounted.current) setData(res.data);
    } catch (e) {
      if (mounted.current) setError(errMessage(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  return { data, loading, error, refetch: load, setData };
}
