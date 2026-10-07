import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { RoleRoute } from "@/components/layout/RoleRoute";
import { PublicLayout } from "@/components/layout/PublicLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import MarketPrices from "@/pages/MarketPrices";

import FarmerDashboard from "@/pages/farmer/Dashboard";
import Produce from "@/pages/farmer/Produce";
import SellingOptions from "@/pages/farmer/SellingOptions";
import Matches from "@/pages/farmer/Matches";
import FarmerOffers from "@/pages/farmer/Offers";
import Forecast from "@/pages/farmer/Forecast";
import Storage from "@/pages/farmer/Storage";
import MarketMap from "@/pages/shared/MarketMap";
import Assistant from "@/pages/shared/Assistant";
import Notifications from "@/pages/shared/Notifications";
import FarmerProfile from "@/pages/farmer/Profile";
import Transactions from "@/pages/shared/Transactions";
import SharedProfile from "@/pages/shared/Profile";

import BuyerDashboard from "@/pages/buyer/Dashboard";
import BuyerRequirements from "@/pages/buyer/Requirements";
import BuyerFindFarmers from "@/pages/buyer/FindFarmers";
import BuyerOffers from "@/pages/buyer/Offers";

import FpoDashboard from "@/pages/fpo/Dashboard";
import FpoMembers from "@/pages/fpo/Members";
import FpoStock from "@/pages/fpo/Stock";
import FpoAggregation from "@/pages/fpo/Aggregation";

import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminListings from "@/pages/admin/Listings";
import AdminSettings from "@/pages/admin/Settings";

const FARMER_PAGES: Record<string, ReactNode> = {
  "": <FarmerDashboard />,
  market: <MarketPrices />,
  produce: <Produce />,
  selling: <SellingOptions />,
  matches: <Matches />,
  offers: <FarmerOffers />,
  transactions: <Transactions viewer="farmer" />,
  forecast: <Forecast />,
  storage: <Storage />,
  map: <MarketMap />,
  assistant: <Assistant />,
  notifications: <Notifications />,
  profile: <FarmerProfile />,
};

const BUYER_PAGES: Record<string, ReactNode> = {
  "": <BuyerDashboard />,
  requirements: <BuyerRequirements />,
  matches: <BuyerFindFarmers />,
  offers: <BuyerOffers />,
  transactions: <Transactions viewer="buyer" />,
  map: <MarketMap />,
  notifications: <Notifications />,
  profile: <SharedProfile />,
};

const FPO_PAGES: Record<string, ReactNode> = {
  "": <FpoDashboard />,
  members: <FpoMembers />,
  stock: <FpoStock />,
  aggregation: <FpoAggregation />,
  map: <MarketMap />,
  notifications: <Notifications />,
  profile: <SharedProfile />,
};

const ADMIN_PAGES: Record<string, ReactNode> = {
  "": <AdminDashboard />,
  users: <AdminUsers />,
  listings: <AdminListings />,
  settings: <AdminSettings />,
  notifications: <Notifications />,
  profile: <SharedProfile />,
};

function AppRoutes({ base, pages }: { base: string; pages: Record<string, ReactNode> }) {
  const role = base.slice(5) as "farmer" | "buyer" | "fpo" | "admin";
  return (
    <Routes>
      <Route element={<AppShell />}>
        {Object.entries(pages).map(([path, page]) => (
          <Route
            key={path}
            index={path === ""}
            path={path === "" ? undefined : path}
            element={<RoleRoute role={role}>{page}</RoleRoute>}
          />
        ))}
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/markets" element={<MarketPrices />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/app/farmer/*" element={<AppRoutes base="/app/farmer" pages={FARMER_PAGES} />} />
        <Route path="/app/buyer/*" element={<AppRoutes base="/app/buyer" pages={BUYER_PAGES} />} />
        <Route path="/app/fpo/*" element={<AppRoutes base="/app/fpo" pages={FPO_PAGES} />} />
        <Route path="/app/admin/*" element={<AppRoutes base="/app/admin" pages={ADMIN_PAGES} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
