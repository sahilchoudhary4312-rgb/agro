import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errMessage } from "@/lib/api";
import { Card, DemoChip } from "@/components/ui";
import { Icon } from "@/components/Icon";

interface Msg { role: "user" | "bot"; text: string; source?: string }

const SUGGESTIONS = [
  "What is today's wheat price?",
  "सोयाबीन का भाव क्या है?",
  "Best buyer near me for onion",
  "Should I sell or wait?",
];

export default function Assistant() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "bot", text: "Namaste! I'm AgriMitra. Ask me about mandi prices, buyers, or selling. I answer from the platform's demo data — I never make up prices." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.title = "Assistant · AgriMitra"; }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || busy) return;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const res = await api.post("/assistant", { message: msg });
      setMessages((m) => [...m, { role: "bot", text: res.data.reply, source: res.data.source }]);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 flex flex-col min-h-[70dvh]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.assistant")} <DemoChip className="ml-1 align-middle" /></h1>
      </div>
      <div className="text-xs text-ink-mute">{t("page.assistantNote")}</div>

      <Card className="flex-1 flex flex-col !p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary-700 text-white rounded-br-md"
                  : "bg-gray-100 text-ink rounded-bl-md"
              }`}>
                {m.text}
                {m.source && (
                  <div className="text-[10px] mt-1.5 opacity-70 flex items-center gap-1">
                    <Icon name="shield" className="w-3 h-3" /> source: {m.source}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:120ms]" />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:240ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-gray-100 p-3">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} disabled={busy}
                className="chip bg-leaf-50 text-primary-700 border border-leaf-200 hover:bg-leaf-100 text-[11px]">
                {s}
              </button>
            ))}
          </div>
          {error && <div className="text-xs text-red-600 mb-1.5">{error}</div>}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex gap-2"
          >
            <input
              className="input flex-1"
              placeholder={t("page.askPlaceholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={busy || !input.trim()} className="btn-primary !px-4">
              <Icon name="arrowRight" className="w-4 h-4" />
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
