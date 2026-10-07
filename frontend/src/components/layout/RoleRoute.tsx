import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/store/auth";
import type { Role } from "@/types";

export function RoleRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { token, role: myRole, loadMe } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (token && !myRole) loadMe();
  }, [token, myRole, loadMe]);

  if (!token) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (myRole && myRole !== role) return <Navigate to={`/app/${myRole}`} replace />;
  return <>{children}</>;
}
