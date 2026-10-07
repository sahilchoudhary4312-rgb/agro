import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errMessage } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import type { Listing } from "@/types";
import { Badge, Card, DemoChip, EmptyState, ErrorState, SectionTitle, Spinner, inr, num } from "@/components/ui";
import { Icon } from "@/components/Icon";

interface CropOpt { id: string; name: string; icon: string }

const GRADES = ["A", "B", "C"];

interface FormState {
  crop_id: string;
  quantity_qtl: string;
  quality_grade: string;
  moisture_pct: string;
  price_expectation: string;
  village: string;
  district: string;
}

const EMPTY: FormState = {
  crop_id: "",
  quantity_qtl: "",
  quality_grade: "A",
  moisture_pct: "",
  price_expectation: "",
  village: "",
  district: "",
};

export default function Produce() {
  const { t } = useTranslation();
  const listings = useApi<Listing[]>("/farmers/produce");
  const crops = useApi<CropOpt[]>("/public/crops");
  const profile = useApi<{ farmer: { village: string | null; district: string | null } }>("/farmers/profile");

  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => { document.title = "My Produce · AgriMitra"; }, []);

  const openAdd = () => {
    setForm({
      ...EMPTY,
      village: profile.data?.farmer.village ?? "",
      district: profile.data?.farmer.district ?? "",
    });
    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = (l: Listing) => {
    setForm({
      crop_id: l.crop_id,
      quantity_qtl: String(l.quantity_qtl),
      quality_grade: l.quality_grade,
      moisture_pct: l.moisture_pct != null ? String(l.moisture_pct) : "",
      price_expectation: l.price_expectation != null ? String(l.price_expectation) : "",
      village: l.village ?? "",
      district: l.district ?? "",
    });
    setEditingId(l.id);
    setError("");
    setShowForm(true);
  };

  const submit = async () => {
    if (!form.crop_id) { setError("Please choose a crop."); return; }
    if (!form.quantity_qtl || Number(form.quantity_qtl) <= 0) { setError("Quantity must be greater than 0."); return; }
    setBusy(true);
    setError("");
    const payload = {
      crop_id: form.crop_id,
      quantity_qtl: Number(form.quantity_qtl),
      quality_grade: form.quality_grade,
      moisture_pct: form.moisture_pct === "" ? null : Number(form.moisture_pct),
      price_expectation: form.price_expectation === "" ? null : Number(form.price_expectation),
      village: form.village || null,
      district: form.district || null,
    };
    try {
      if (editingId) await api.put(`/farmers/produce/${editingId}`, payload);
      else await api.post("/farmers/produce", payload);
      setShowForm(false);
      setFlash(editingId ? "Listing updated" : "Produce listed");
      setTimeout(() => setFlash(""), 2500);
      listings.refetch();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const markSold = async (l: Listing) => {
    try {
      await api.put(`/farmers/produce/${l.id}`, { status: "sold" });
      listings.refetch();
    } catch (e) {
      setError(errMessage(e));
    }
  };

  const remove = async (l: Listing) => {
    if (!window.confirm(`Delete listing "${l.crop_name} ${l.quantity_qtl} qtl"? This cannot be undone.`)) return;
    try {
      await api.delete(`/farmers/produce/${l.id}`);
      listings.refetch();
    } catch (e) {
      setError(errMessage(e));
    }
  };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.produce")} <DemoChip className="ml-1 align-middle" /></h1>
        <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2">
          <Icon name="plus" className="w-4 h-4" /> {t("page.addProduce")}
        </button>
      </div>

      {flash && <div className="rounded-xl bg-leaf-100 text-primary-800 px-4 py-2.5 text-sm font-semibold">{flash}</div>}
      {error && !showForm && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">{error}</div>}

      {showForm && (
        <Card className="!border-primary-200">
          <SectionTitle title={editingId ? t("page.editProduce") : t("page.addProduce")} action={
            <button onClick={() => setShowForm(false)} className="btn-ghost !p-2"><Icon name="x" className="w-4 h-4" /></button>
          } />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{t("page.crop")} *</label>
              <select className="input" value={form.crop_id} onChange={set("crop_id")} disabled={!!editingId}>
                <option value="">—</option>
                {(crops.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("page.quantity")} *</label>
              <input className="input" type="number" min="0.1" step="0.1" value={form.quantity_qtl} onChange={set("quantity_qtl")} />
            </div>
            <div>
              <label className="label">{t("page.grade")}</label>
              <div className="flex gap-2">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, quality_grade: g }))}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold ${form.quality_grade === g ? "border-primary-600 bg-leaf-100 text-primary-800" : "border-gray-200 text-ink-soft"}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">{t("page.moisture")}</label>
              <input className="input" type="number" min="0" max="60" step="0.1" value={form.moisture_pct} onChange={set("moisture_pct")} />
            </div>
            <div>
              <label className="label">{t("page.expectedPrice")}</label>
              <input className="input" type="number" min="0" step="1" value={form.price_expectation} onChange={set("price_expectation")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t("auth.village")}</label>
                <input className="input" value={form.village} onChange={set("village")} />
              </div>
              <div>
                <label className="label">{t("auth.district")}</label>
                <input className="input" value={form.district} onChange={set("district")} />
              </div>
            </div>
          </div>
          {error && <div className="mt-3 rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">{error}</div>}
          <div className="mt-4 flex gap-2">
            <button onClick={submit} disabled={busy} className="btn-primary">
              {busy ? "…" : t("common.save")}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">{t("common.cancel")}</button>
          </div>
        </Card>
      )}

      {listings.loading ? (
        <Spinner />
      ) : listings.error ? (
        <ErrorState message={listings.error} onRetry={listings.refetch} />
      ) : !listings.data?.length ? (
        <Card><EmptyState icon="sprout" title={t("page.noProduce")} hint={t("page.noProduceHint")} /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {listings.data.map((l) => (
            <Card key={l.id} className="flex flex-col">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{l.crop_icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-ink">{l.crop_name}</span>
                    <Badge tone={l.status === "available" ? "green" : l.status === "sold" ? "gray" : "amber"}>{l.status}</Badge>
                    <Badge tone="blue">Grade {l.quality_grade}</Badge>
                  </div>
                  <div className="text-sm text-ink-soft mt-0.5">
                    {num(l.quantity_qtl)} qtl{l.moisture_pct != null && <> · {t("page.moisture")} {num(l.moisture_pct)}%</>}
                  </div>
                  <div className="text-xs text-ink-mute mt-0.5">
                    {l.village}, {l.district} · {t("page.listedOn")} {new Date(l.created_at).toLocaleDateString("en-IN")}
                    {l.price_expectation != null && <> · exp. {inr(l.price_expectation)}/qtl</>}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                <button onClick={() => openEdit(l)} className="btn-ghost !py-1.5 text-xs inline-flex items-center gap-1">
                  <Icon name="settings" className="w-3.5 h-3.5" /> {t("common.edit")}
                </button>
                {l.status === "available" && (
                  <button onClick={() => markSold(l)} className="btn-ghost !py-1.5 text-xs">{t("page.markSold")}</button>
                )}
                <button
                  onClick={() => remove(l)}
                  className="ml-auto text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1"
                >
                  <Icon name="x" className="w-3.5 h-3.5" /> {t("common.delete")}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
