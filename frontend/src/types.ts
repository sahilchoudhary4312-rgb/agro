export type Role = "farmer" | "buyer" | "fpo" | "admin";

export interface TokenOut {
  access_token: string;
  refresh_token: string;
  role: Role;
  full_name: string;
  id: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  preferred_language: "en" | "hi" | "mr";
  phone: string | null;
  is_active: boolean;
}

export interface SellingOption {
  type: "buyer" | "mandi" | "fpo";
  buyer_id?: string;
  buyer_name?: string;
  name?: string;
  requirement_id?: string;
  offer_id?: string;
  direct_offer?: boolean;
  verification_status?: string;
  gross_price_per_qtl: number;
  max_price_per_qtl?: number;
  min_price_per_qtl?: number;
  price_date?: string;
  transport_per_qtl: number;
  handling_per_qtl: number;
  net_realization_per_qtl: number;
  net_total: number;
  distance_km: number;
  estimated_hours?: number;
  trust_score?: number;
  on_time_payment_pct?: number;
  farmer_rating?: number | null;
  payment_terms?: string | null;
  pickup_preference?: string;
  quantity_qtl?: number;
  quantity_min_qtl?: number;
  quantity_max_qtl?: number;
  quality_match?: number;
  quantity_match?: number;
  mandi_fee_per_qtl?: number;
  arrival_tip?: string;
  score?: number;
  rank?: number;
  reasons?: string[];
}

export interface ForecastData {
  available: boolean;
  reason?: string;
  model?: string;
  confidence?: number;
  current_price?: number;
  horizons: Record<string, { predicted_price?: number; change_pct?: number; trend?: string; price?: number }>;
  trend?: string;
  chart: { day: number; date: string; estimated_price: number }[];
  crop_id?: string;
  crop_name?: string;
  data_label?: string;
  sell_recommendation?: SellRecommendation | null;
}

export interface SellRecommendation {
  recommendation: "sell_now" | "wait";
  reason_code: string;
  message: string;
}

export interface Recommendations {
  listing_id: string;
  crop: string | null;
  quantity_qtl: number;
  storage_available: boolean;
  forecast: ForecastData;
  sell_recommendation: SellRecommendation | null;
  options: SellingOption[];
  best_option: (SellingOption & { reasons?: string[] }) | null;
}

export interface Listing {
  id: string;
  crop_id: string;
  crop_name: string;
  crop_icon: string;
  quantity_qtl: number;
  quality_grade: string;
  moisture_pct: number | null;
  village: string;
  district: string;
  price_expectation: number | null;
  status: string;
  created_at: string;
  photo_path: string | null;
  [k: string]: unknown;
}

export interface BuyerRequirement {
  id: string;
  crop_id: string;
  crop_name?: string;
  crop_icon?: string;
  quantity_min_qtl: number;
  quantity_max_qtl: number;
  quality_grade: string;
  price_per_qtl: number;
  payment_terms: string;
  pickup_preference: string;
  status: string;
  valid_until: string;
  distance_km?: number;
  [k: string]: unknown;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  [k: string]: unknown;
}

export interface FarmerProfileData {
  user: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    preferred_language: string;
  };
  farmer: {
    village: string | null;
    district: string | null;
    state: string | null;
    pincode: string | null;
    latitude: number | null;
    longitude: number | null;
    land_size_acres: number | null;
    irrigation: string | null;
  };
}
