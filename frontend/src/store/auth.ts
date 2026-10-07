import { create } from "zustand";
import { api, TOKEN_KEY } from "@/lib/api";
import type { Role, TokenOut, User } from "@/types";

interface AuthState {
  token: string | null;
  role: Role | null;
  fullName: string | null;
  userId: string | null;
  me: User | null;
  login: (email: string, password: string) => Promise<TokenOut>;
  register: (payload: Record<string, unknown>) => Promise<TokenOut>;
  loadMe: () => Promise<void>;
  setLanguage: (lang: "en" | "hi" | "mr") => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY),
  role: (localStorage.getItem("agrimitra_role") as Role) || null,
  fullName: localStorage.getItem("agrimitra_name"),
  userId: localStorage.getItem("agrimitra_uid"),
  me: null,

  async login(email, password) {
    const { data } = await api.post<TokenOut>("/auth/login", { email, password });
    applySession(data);
    return data;
  },

  async register(payload) {
    const { data } = await api.post<TokenOut>("/auth/register", payload);
    applySession(data);
    return data;
  },

  async loadMe() {
    if (!get().token) return;
    const { data } = await api.get<User>("/auth/me");
    set({ me: data, role: data.role, fullName: data.full_name, userId: data.id });
  },

  async setLanguage(lang) {
    set((s) => (s.me ? { me: { ...s.me, preferred_language: lang } } : {}));
    try {
      await api.put("/auth/me/language", null, { params: { language: lang } });
    } catch {
      /* language preference is best-effort */
    }
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("agrimitra_role");
    localStorage.removeItem("agrimitra_name");
    localStorage.removeItem("agrimitra_uid");
    set({ token: null, role: null, fullName: null, userId: null, me: null });
  },
}));

function applySession(data: TokenOut) {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem("agrimitra_role", data.role);
  localStorage.setItem("agrimitra_name", data.full_name);
  localStorage.setItem("agrimitra_uid", data.id);
  useAuth.setState({
    token: data.access_token,
    role: data.role,
    fullName: data.full_name,
    userId: data.id,
    me: null,
  });
}
