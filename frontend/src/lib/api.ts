import axios from "axios";

export const TOKEN_KEY = "agrimitra_token";

export const api = axios.create({
  baseURL: "/api",
  timeout: 20000,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?expired=1";
      }
    }
    return Promise.reject(err);
  },
);

export function errMessage(err: unknown): string {
  const e = err as { response?: { data?: { detail?: unknown } }; message?: string };
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    if (first?.msg) return first.msg;
  }
  return e?.message || "Something went wrong";
}
