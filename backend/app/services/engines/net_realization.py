"""Net realization: what the farmer actually takes home per quintal.

net = gross_price - transport_per_qtl - handling_per_qtl - market_fees_per_qtl
This is the central metric of AgriMitra — the best gross price is not always
the best net return.
"""

MARKET_FEE_PER_QTL = 15  # mandi cess/labor estimate for mandi sales


def compute_net_realization(
    gross_price_per_qtl: float,
    transport_per_qtl: float | None,
    handling_per_qtl: float = 0,
    is_mandi: bool = False,
) -> dict:
    transport = transport_per_qtl or 0
    fees = MARKET_FEE_PER_QTL if is_mandi else 0
    net = round(gross_price_per_qtl - transport - handling_per_qtl - fees, 2)
    return {
        "gross_price_per_qtl": gross_price_per_qtl,
        "transport_per_qtl": round(transport, 2),
        "handling_per_qtl": handling_per_qtl,
        "market_fees_per_qtl": fees,
        "net_realization_per_qtl": max(net, 0),
    }
