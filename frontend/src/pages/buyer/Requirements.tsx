import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errMessage } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Badge, Card, DemoChip, EmptyState, ErrorState, Spinner, inr, num } from "@/components/ui";
import { Icon } from "@/components/Icon";

interface Crop { id: string; name: string; icon: string | null }
interface Req {
  id: string; crop_id: string; crop_name: string | null; crop_icon: string | null;
  quantity_min_qtl: number; quantity_max_qtl: number; quality_grade: string;
  max_moisture_pct: number | null; price_per_qtl: number; price_negotiable: boolean;
  pickup_preference: string; payment_terms: string | null; delivery_radius_km: number;
  notes: string | null; valid_until: string | null; status: string; created_at: string | null;
}

const EMPTY_FORM = {
  crop_id: "", quantity_min_qtl: "", quantity_max_qtl: "", quality_grade: "A",
  max_moisture_pct: "", price_per_qtl: "", price_negotiable: true,
  pickup_preference: "farm_gate", payment_terms: "", delivery_radius_km: "100",
  notes: "", valid_until: "",
};

export default function BuyerRequirements() {
  const { t } = useTranslation();
  const mine = useApi<Req[]>("/buyers/requirements/mine");
  const crops = useApi<Crop[]>("/public/crops");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => { document.title = "My Requirements · AgriMitra"; }, []);

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, crop_id: crops.data?.[0]?.id ?? "" });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (r: Req) => {
    setForm({
      crop_id: r.crop_id,
      quantity_min_qtl: String(r.quantity_min_qtl),
      quantity_max_qtl: String(r.quantity_max_qtl),
      quality_grade: r.quality_grade,
      max_moisture_pct: r.max_moisture_pct != null ? String(r.max_moisture_pct) : "",
      price_per_qtl: String(r.price_per_qtl),
      price_negotiable: r.price_negotiable,
      pickup_preference: r.pickup_preference,
      payment_terms: r.payment_terms ?? "",
      delivery_radius_km: String(r.delivery_radius_km),
      notes: r.notes ?? "",
      valid_until: r.valid_until ?? "",
    });
    setEditId(r.id);
    setShowForm(true);
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = {
        crop_id: form.crop_id,
        quantity_min_qtl: Number(form.quantity_min_qtl || 0),
        quantity_max_qtl: Number(form.quantity_max_qtl),
        quality_grade: form.quality_grade,
        max_moisture_pct: form.max_moisture_pct ? Number(form.max_moisture_pct) : null,
        price_per_qtl: Number(form.price_per_qtl),
        price_negotiable: form.price_negotiable,
        pickup_preference: form.pickup_preference,
        payment_terms: form.payment_terms || null,
        delivery_radius_km: Number(form.delivery_radius_km || 100),
        notes: form.notes || null,
        valid_until: form.valid_until || null,
      };
      if (editId) {
        await api.put(`/buyers/requirements/${editId}`, payload);
        setFlash("Requirement updated");
      } else {
        await api.post("/buyers/requirements", payload);
        setFlash("Requirement posted — matching farmers will see it immediately");
      }
      setShowForm(false);
      setEditId(null);
      setTimeout(() => setFlash(""), 3000);
      mine.refetch();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const closeReq = async (id: string) => {
    setBusy(true);
    try {
      await api.delete(`/buyers/requirements/${id}`);
      setFlash("Requirement closed");
      setTimeout(() => setFlash(""), 2500);
      mine.refetch();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const valid = form.crop_id && Number(form.quantity_max_qtl) > 0 && Number(form.price_per_qtl) > 0
    && Number(form.quantity_max_qtl) >= Number(form.quantity_min_qtl || 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.requirements")} <DemoChip className="ml-1 align-middle" /></h1>
        <button onClick={openCreate} className="btn-primary !py-2 text-xs inline-flex items-center gap-1">
          <Icon name="plus" className="w-3.5 h-3.5" /> New requirement
        </button>
      </div>

      {flash && <div className="rounded-xl bg-leaf-100 text-primary-800 px-4 py-2.5 text-sm font-semibold">{flash}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">{error}</div>}

      {showForm && (
        <Card className="border border-gray-200">
          <div className="font-bold text-ink mb-3">{editId ? "Edit requirement" : "Post a new requirement"}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Crop</span>
              <select className="input" value={form.crop_id} onChange={(e) => set("crop_id", e.target.value)}>
                <option value="">Select crop…</option>
                {(crops.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.icon ? c.icon + " " : ""}{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Quality grade</span>
              <select className="input" value={form.quality_grade} onChange={(e) => set("quality_grade", e.target.value)}>
                <option value="A">A — best</option>
                <option value="B">B — standard</option>
                <option value="C">C — basic</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Quantity min (qtl)</span>
              <input className="input" type="number" min="0" value={form.quantity_min_qtl} onChange={(e) => set("quantity_min_qtl", e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Quantity max (qtl)</span>
              <input className="input" type="number" min="1" value={form.quantity_max_qtl} onChange={(e) => set("quantity_max_qtl", e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Offer price (₹/qtl)</span>
              <input className="input" type="number" min="1" value={form.price_per_qtl} onChange={(e) => set("price_per_qtl", e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Max moisture % ({t("common.optional")})</span>
              <input className="input" type="number" min="0" max="60" value={form.max_moisture_pct} onChange={(e) => set("max_moisture_pct", e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Pickup preference</span>
              <select className="input" value={form.pickup_preference} onChange={(e) => set("pickup_preference", e.target.value)}>
                <option value="farm_gate">Farm gate (I collect)</option>
                <option value="mandi">Mandi drop-off</option>
                <option value="collection_center">Collection centre</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Delivery radius (km)</span>
              <input className="input" type="number" min="5" value={form.delivery_radius_km} onChange={(e) => set("delivery_radius_km", e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Payment terms</span>
              <input className="input" placeholder="e.g. 50% advance, rest on delivery" value={form.payment_terms} onChange={(e) => set("payment_terms", e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Valid until ({t("common.optional")})</span>
              <input className="input" type="date" value={form.valid_until} onChange={(e) => set("valid_until", e.target.value)} />
            </label>
            <div className="sm:col-span-2">
              <span className="label">Notes ({t("common.optional")})</span>
              <input className="input" placeholder="Anything else farmers should know" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => set("price_negotiable", !form.price_negotiable)}
                className={`chip ${form.price_negotiable ? "bg-leaf-100 text-primary-800" : "bg-gray-100 text-gray-500"}`}
              >
                <Icon name={form.price_negotiable ? "check" : "x"} className="w-3 h-3" /> Price negotiable
              </button>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={submit} disabled={busy || !valid} className="btn-primary !py-2 text-xs disabled:opacity-50">
              {busy ? "…" : editId ? "Save changes" : "Post requirement"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="btn-ghost !py-2 text-xs">{t("common.cancel")}</button>
          </div>
        </Card>
      )}

      {mine.loading ? (
        <Spinner />
      ) : mine.error ? (
        <ErrorState message={mine.error} onRetry={mine.refetch} />
      ) : (mine.data ?? []).length === 0 ? (
        <Card>
          <EmptyState icon="clipboard" title="No requirements yet" hint="Post what you need and farmers near you will respond with offers." />
        </Card>
      ) : (
        <div className="space-y-3">
          {mine.data!.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-leaf-100 text-primary-700 flex items-center justify-center shrink-0 text-xl">
                  {r.crop_icon ?? "🌱"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-ink">{r.crop_name}</span>
                    <Badge tone={r.status === "open" ? "green" : "gray"}>{r.status}</Badge>
                    <Badge tone="gray">G{r.quality_grade}</Badge>
                    {r.price_negotiable && <Badge tone="amber">negotiable</Badge>}
                  </div>
                  <div className="text-sm text-ink-soft mt-0.5">
                    {num(r.quantity_min_qtl)}–{num(r.quantity_max_qtl)} qtl · {inr(r.price_per_qtl)}/qtl
                    {r.max_moisture_pct != null && <> · max {num(r.max_moisture_pct)}% moisture</>}
                  </div>
                  <div className="text-xs text-ink-mute mt-0.5">
                    {r.pickup_preference.replace("_", " ")} · radius {num(r.delivery_radius_km, 0)} km
                    {r.payment_terms && <> · {r.payment_terms}</>}
                    {r.valid_until && <> · valid until {r.valid_until}</>}
                  </div>
                  {r.notes && <div className="text-xs text-ink-soft italic mt-1">“{r.notes}”</div>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                <button onClick={() => openEdit(r)} className="btn-ghost !py-1.5 text-xs">{t("common.edit")}</button>
                {r.status === "open" && (
                  <button onClick={() => closeReq(r.id)} disabled={busy} className="btn-ghost !py-1.5 text-xs !text-red-600">
                    Close requirement
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
