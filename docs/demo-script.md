# AgriMitra — 5-Minute Demo Script

For SIH judges. Demo logins (one-tap buttons on the login page):
`farmer@demo.com` · `buyer@demo.com` · `fpo@demo.com` · `admin@demo.com`.

> All data shown is **DEMO DATA** — clearly labelled in the UI. Nothing is presented
> as live government data.

---

## 0 · Landing (30s)

Open the app. Point out: bilingual Hindi/Marathi support (switch language top-right),
price ticker, and the honesty labels — **DEMO DATA** badges on every price.

## 1 · The core idea — Net Realization (60s, Farmer)

Login → **Farmer**.

1. Dashboard: demo farmer's land, listings, alerts.
2. **Market**: today's mandi prices (DEMO DATA), trend charts.
3. **Sell / Best options** for a listing: the table ranks every option by
   **NET REALIZATION** — gross price minus transport, handling, mandi fee (₹15/qtl).
   *Call out*: a buyer with a **lower gross price** wins because transport is
   farm-gate pickup — the platform recommends by take-home, not sticker price.
   Each row is explainable: price/quality/quantity/distance/payment sub-scores.
4. **Forecast**: price outlook is labelled **PREDICTED** with a confidence %, and a
   plain-language sell-now/wait suggestion.

## 2 · The full deal loop (90s, Farmer + Buyer)

1. Farmer → **Buyer matches**: ranked open requirements for a crop.
2. "Respond with a listing" → sends an offer.
3. Logout → login as **Buyer** → **Offers**: see the incoming offer → **Accept** →
   toast: *"Offer accepted — transaction created"*.
4. Buyer → **Transactions**: open the new transaction — full net-realization
   breakdown recorded (agreed price, logistics, handling, net total).
5. Walk the forward-only lifecycle: schedule pickup → in transit → delivered →
   record payment (UPI/bank/cash) → **paid**. Every step updates both sides.

## 3 · FPO aggregation (60s, FPO)

Login → **FPO**.

1. Dashboard: member count, aggregated stock.
2. **Members**: farmer roster.
3. **Aggregation**: pick a bulk requirement — the engine matches across member
   listings and shows whether combined supply fulfils the requirement (small
   farmers together win large contracts).

## 4 · Admin controls (45s, Admin)

Login → **Admin**.

1. Dashboard: platform stats and charts.
2. **Users**: filter by role; verify a pending buyer (trust score updates).
3. **System settings**: move the *price* matching weight → save. Match rankings
   change instantly — policy is tunable at runtime, no redeploy.

## 5 · Field-ready PWA (30s)

1. In the browser: install prompt / add to home screen (production build).
2. Toggle offline (DevTools → Network → Offline): app shell loads, amber
   *"You're offline — data will refresh when you reconnect"* banner appears.
   **We never cache API responses** — farmers never see stale prices masquerading
   as fresh ones.
3. Assistant page: rule-based, localized Q&A — no external AI keys.

## Closing line (15s)

"AgriMitra doesn't just find the highest price — it finds the best **take-home**,
connects farmers to verified buyers directly or through their FPO, and is honest
about what is demo data, what is measured, and what is predicted."
