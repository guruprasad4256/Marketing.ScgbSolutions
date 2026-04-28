import { useEffect, useMemo, useState } from "react";
import logo from "@/assets/scgb.webp";
import { Sun, Moon, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/utils/Api";
import { toast } from "sonner";
import useUser from "@/hooks/useUser";

export default function Login() {
    const navigate = useNavigate();
    const { user, fetchUser } = useUser();
    const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("dark", theme === "dark");
        localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const currentUser = await fetchUser();

                if (currentUser) {
                    const isPartner = currentUser?.role?.isPartner;

                    navigate(
                        isPartner ? "/partner-dashboard" : "/dashboard",
                        { replace: true }
                    );
                }
            } catch (err) {
                console.error("User check failed", err);
            }
        };

        checkUser();
    }, [fetchUser, navigate]);

    const heroBg = useMemo(
        () => ({
            background:
                "radial-gradient(900px circle at 20% 10%, rgba(25, 68, 133, 0.22), transparent 60%)," +
                "radial-gradient(700px circle at 80% 30%, rgba(251, 213, 5, 0.18), transparent 55%)," +
                "linear-gradient(to bottom, hsl(var(--background)), hsl(var(--background)))",
        }),
        []
    );

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const toastId = toast.loading("Signing in...");

        try {
            const res = await api.post(
                "/api/users/leads-crm",
                { email, password },
                { withCredentials: true }
            );

            if (res?.status === 200) {

                const user = await fetchUser();

                if (!user) {
                    toast.error("Unable to load user data.", { id: toastId });
                    return;
                }

                toast.success("Login successful", { id: toastId });

                const isPartner = user?.role?.isPartner;

                navigate(
                    isPartner ? "/partner-dashboard" : "/dashboard",
                    { replace: true }
                );
            }
        } catch (err) {
            console.error("Login error:", err);

            const status = err?.response?.status;
            const serverMessage = err?.response?.data?.message || err?.response?.data?.error;

            let userMessage = "Login failed. Please check your credentials.";

            if (status === 400) {
                userMessage = serverMessage || "Invalid email or password.";
            } else if (status === 403) {
                userMessage = serverMessage || "You are not authorized to access this system.";
            } else if (status === 401) {
                userMessage = "Your session is invalid. Please login again.";
            } else if (!err.response) {
                userMessage = "Network error. Please check your internet connection.";
            }

            toast.error(userMessage, { id: toastId });
            setError(userMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4 py-10 bg-background text-foreground"
            style={heroBg}
        >
            <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-2">
                {/* Left panel (desktop) */}
                <div className="hidden lg:block rounded-2xl border border-border bg-card shadow-lg p-8 relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-20 bg-accent" />
                    <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full opacity-20 bg-primary" />

                    <div className="relative z-10 flex flex-col gap-6 h-full">
                        <img src={logo} alt="SCGB" className="h-18 w-36" />

                        <div>
                            <h1 className="text-3xl font-bold leading-tight">
                                Welcome to <span className="text-primary">SCGB CRM</span>
                            </h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Manage leads, track follow-ups, and monitor sales progress in one place with a clean, SCGB-branded CRM experience.
                            </p>
                        </div>

                        <div className="mt-auto rounded-2xl border border-border bg-background/40 p-4">
                            <p className="text-sm font-semibold">Secure Admin/Sales Access</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Only Admin and Sales users are allowed to login.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right login card */}
                <div className="rounded-2xl border border-border bg-card shadow-lg p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <img src={logo} alt="SCGB" className="h-10 w-auto lg:hidden" />
                            <div>
                                <h2 className="text-xl font-bold">Login</h2>
                                <p className="text-sm text-muted-foreground">Enter your credentials to continue</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                            className="h-10 w-10 flex items-center justify-center rounded-xl
              border border-border bg-background/40 hover:bg-background transition"
                            aria-label="Toggle theme"
                        >
                            {theme === "dark" ? (
                                <Sun className="h-5 w-5 text-accent" />
                            ) : (
                                <Moon className="h-5 w-5 text-primary" />
                            )}
                        </button>
                    </div>

                    <form onSubmit={onSubmit} className="mt-6 space-y-4">
                        {error && (
                            <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium">Email</label>
                            <input
                                className="mt-2 h-11 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none
                placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Password</label>

                            {/* ✅ password input with show/hide */}
                            <div className="relative mt-2">
                                <input
                                    className="h-11 w-full rounded-xl border border-input bg-background/40 px-4 pr-12 text-sm outline-none
                  placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg transition"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    disabled={loading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="h-11 w-full rounded-xl bg-primary text-primary-foreground font-medium
              hover:opacity-95 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>

                        <div className="pt-2 text-center text-sm text-muted-foreground">
                            Don’t have access?{" "}
                            <button type="button" className="font-medium text-primary hover:underline" disabled={loading}>
                                Contact admin
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}