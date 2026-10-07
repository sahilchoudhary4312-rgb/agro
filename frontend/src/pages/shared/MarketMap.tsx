import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { useTranslation } from "react-i18next";
import { useApi } from "@/lib/useApi";
import { Badge, Card, DemoChip, ErrorState, Spinner } from "@/components/ui";

interface MarketPt {
  id: string; name: string; type: string; district: string;
  latitude: number | null; longitude: number | null;
}
interface MapResp { markets: MarketPt[] }

export default function MarketMap() {
  const { t } = useTranslation();
  const map = useApi<MapResp>("/markets/map");

  useEffect(() => { document.title = "Markets Map · AgriMitra"; }, []);

  const points = useMemo(() => (map.data?.markets ?? []).filter((m) => m.latitude != null && m.longitude != null), [map.data]);
  const center = useMemo<[number, number]>(() => {
    if (!points.length) return [19.7515, 75.7139]; // Maharashtra
    const lat = points.reduce((s, p) => s + (p.latitude ?? 0), 0) / points.length;
    const lon = points.reduce((s, p) => s + (p.longitude ?? 0), 0) / points.length;
    return [lat, lon];
  }, [points]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("page.marketsMap")} <DemoChip className="ml-1 align-middle" /></h1>
        <div className="flex items-center gap-3 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-primary-600 inline-block" /> {t("page.apmc")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-accent-500 inline-block" /> {t("page.other")}
          </span>
        </div>
      </div>

      {map.loading ? (
        <Spinner />
      ) : map.error ? (
        <ErrorState message={map.error} onRetry={map.refetch} />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="h-[420px] sm:h-[520px]">
            <MapContainer center={center} zoom={7} scrollWheelZoom className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {points.map((m) => (
                <CircleMarker
                  key={m.id}
                  center={[m.latitude!, m.longitude!]}
                  radius={7}
                  pathOptions={{
                    color: "#fff",
                    weight: 1.5,
                    fillColor: m.type === "apmc" ? "#1c5d37" : "#f59e0b",
                    fillOpacity: 0.9,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -6]}>
                    <div className="text-xs">
                      <div className="font-bold">{m.name}</div>
                      <div className="text-gray-500">{m.district} · {m.type.toUpperCase()}</div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-[11px] text-ink-mute">
            {points.length} markets · map data © OpenStreetMap contributors · market locations are demo data
          </div>
        </Card>
      )}
      {points.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Array.from(new Set(points.map((p) => p.district))).sort().map((d) => (
            <Badge key={d} tone="gray">{d}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
