"""Buyer trust score — explainable weighted model.

Factors (0-100 normalized), weights sum to 1.0:
  verification 20% | success rate 25% | on-time payment 25%
  farmer rating 15% | disputes penalty 10% | account age 5%
Only the resulting score and its sub-scores are exposed; no private data.
"""


def compute_trust_score(
    verification_status: str,
    total_transactions: int,
    successful_transactions: int,
    on_time_payment_pct: float,
    farmer_rating: float,  # 0..5
    dispute_count: int,
    account_age_days: int,
) -> dict:
    verification = 100 if verification_status == "verified" else (40 if verification_status == "pending" else 0)

    if total_transactions > 0:
        success_rate = 100.0 * successful_transactions / total_transactions
    else:
        success_rate = 50.0  # new buyer — neutral

    on_time = max(0.0, min(100.0, on_time_payment_pct))
    rating_score = (farmer_rating / 5.0) * 100

    # dispute penalty: each dispute costs, capped
    dispute_score = max(0.0, 100.0 - dispute_count * 10)

    age_score = min(100.0, (account_age_days / 365.0) * 100)

    score = (
        0.20 * verification
        + 0.25 * success_rate
        + 0.25 * on_time
        + 0.15 * rating_score
        + 0.10 * dispute_score
        + 0.05 * age_score
    )
    return {
        "trust_score": round(score, 1),
        "success_rate": round(success_rate, 1),
        "verification_score": verification,
        "on_time_payment": on_time,
        "rating_score": round(rating_score, 1),
        "dispute_score": round(dispute_score, 1),
    }
