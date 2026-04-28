import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/utils/Api";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get("/api/auth/me", { withCredentials: true });

                const userData = res.data?.user || res.data;

                if (userData?.userId) {
                    setUser(userData);
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.error("❌ Failed to fetch user:", err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    // Loading UI
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen px-4">
                <Card className="w-[320px] shadow-md">
                    <CardContent className="space-y-4 p-6">

                        {/* Avatar skeleton */}
                        <div className="flex justify-center">
                            <Skeleton className="h-12 w-12 rounded-full" />
                        </div>

                        {/* Title */}
                        <Skeleton className="h-4 w-[70%] mx-auto" />

                        {/* Text lines */}
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-[90%]" />
                        <Skeleton className="h-3 w-[80%]" />

                    </CardContent>
                </Card>
            </div>
        );
    }

    // 🚫 Not logged in
    if (!user || !user.role) {
        return <Navigate to="/" replace />;
    }

    // ✅ Role check
    const hasAccess =
        allowedRoles.length === 0 ||
        allowedRoles.some((roleKey) => user.role?.[roleKey]);

    if (!hasAccess) {
        return <Navigate to="/404" replace />;
    }

    return children;
};

export default ProtectedRoute;