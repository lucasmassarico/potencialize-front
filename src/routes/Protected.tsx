// src/routes/Protected.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import CenteredLoader from "../components/CenteredLoader";

export default function ProtectedRoute() {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <CenteredLoader label="Autenticando sua conta…" />;

    if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
    return <Outlet />;
}
