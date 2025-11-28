import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../types/auth";

export default function RequireRole({
    role,
    children,
}: {
    role: Role;
    children: React.ReactNode;
}) {
    const { user } = useAuth();
    if (!user) return null; // ProtectedRoute cuida do redirect
    if (user.role !== role) return <Navigate to="/" replace />;
    return <>{children}</>;
}
