import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en";
import hi from "./hi";
import mr from "./mr";

export type Lang = "en" | "hi" | "mr";

const saved = (localStorage.getItem("agrimitra_lang") as Lang) || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    mr: { translation: mr },
  },
  lng: saved,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLang(lang: Lang) {
  localStorage.setItem("agrimitra_lang", lang);
  i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
];
