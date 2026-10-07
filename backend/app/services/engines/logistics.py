"""Logistics cost estimation engine.

Uses a simple distance-based cost model: base loading cost + per-qtl-per-km
transport + handling. In production this can call live transport APIs.
"""

AVG_VEHICLE_SPEED_KMH = 35
HANDLING_COST_PER_QTL = 20  # ₹ per quintal loading/unloading
BASE_COST = 60  # ₹ flat pickup cost spread across quantity


def estimate_logistics(
    distance_km: float | None,
    quantity_qtl: float,
    cost_per_qtl_km: float = 0.9,
) -> dict:
    if distance_km is None:
        return {
            "distance_km": None,
            "transport_per_qtl": None,
            "handling_per_qtl": HANDLING_COST_PER_QTL,
            "total_per_qtl": HANDLING_COST_PER_QTL,
            "estimated_hours": None,
        }
    # small consignments bear the base cost; large ones amortize it
    base_share = BASE_COST / max(quantity_qtl, 1)
    transport_per_qtl = round(distance_km * cost_per_qtl_km + base_share, 2)
    return {
        "distance_km": distance_km,
        "transport_per_qtl": transport_per_qtl,
        "handling_per_qtl": HANDLING_COST_PER_QTL,
        "total_per_qtl": round(transport_per_qtl + HANDLING_COST_PER_QTL, 2),
        "estimated_hours": round(distance_km / AVG_VEHICLE_SPEED_KMH + 2, 1),
    }
