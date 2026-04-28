import { useEffect, useMemo, useState } from "react";
import logo from "@/assets/scgb.webp"; 
import { Sun, Moon, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/utils/Api";
import { toast } from "sonner";
import useUser from "@/hooks/useUser";

export default function Login() {
    const navigate = useNavigate();
    const { fetchUser } = useUser();
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

    // Check if already logged in -> Redirect to Blog Editor
    useEffect(() => {
        const checkUser = async () => {
            try {
                const currentUser = await fetchUser();
                if (currentUser) {
                    navigate("/blog-editor", { replace: true });
                }
            } catch (err) {
                console.error("User check failed", err);
            }
        };

        checkUser();
    }, [fetchUser, navigate]);

    // Marketing Studio Aesthetic Background
    const heroBg = useMemo(
        () => ({
            background: theme === "dark" 
                ? "radial-gradient(900px circle at 20% 10%, rgba(26, 68, 132, 0.15), transparent 60%), radial-gradient(700px circle at 80% 30%, rgba(255, 237, 0, 0.1), transparent 55%), #0f172a"
                : "radial-gradient(900px circle at 20% 10%, rgba(26, 68, 132, 0.08), transparent 60%), radial-gradient(700px circle at 80% 30%, rgba(255, 237, 0, 0.15), transparent 55%), #f8fafc",
        }),
        [theme]
    );

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const toastId = toast.loading("Authenticating...");

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

                toast.success("Welcome to the Studio!", { id: toastId });

                // Redirect straight to the blog editor
                navigate("/blog-editor", { replace: true });
            }
        } catch (err) {
            console.error("Login error:", err);

            const status = err?.response?.status;
            const serverMessage = err?.response?.data?.message || err?.response?.data?.error;

            let userMessage = "Login failed. Please check your credentials.";

            if (status === 400) {
                userMessage = serverMessage || "Invalid email or password.";
            } else if (status === 403) {
                userMessage = serverMessage || "You are not authorized to access the marketing studio.";
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
            className="min-h-screen flex items-center justify-center px-4 py-10 text-foreground transition-colors duration-500"
            style={heroBg}
        >
            <div className="w-full max-w-md">
                {/* Centered login card */}
                <div className="rounded-[2.5rem] border border-border bg-card shadow-xl p-8 sm:p-10 relative overflow-hidden">
                    
                    <div className="relative flex flex-col items-center text-center gap-4 mt-2">
                        <button
                            type="button"
                            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                            className="absolute -top-4 -right-2 shrink-0 h-10 w-10 flex items-center justify-center rounded-xl border border-border bg-background/40 hover:bg-background transition shadow-sm"
                            aria-label="Toggle theme"
                        >
                            {theme === "dark" ? (
                                <Sun className="h-5 w-5 text-[#FFED00]" />
                            ) : (
                                <Moon className="h-5 w-5 text-slate-600" />
                            )}
                        </button>

                        <img src={logo} alt="SCGB" className="h-12 w-auto object-contain" />
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">Welcome Back</h2>
                            <p className="text-sm font-medium text-muted-foreground mt-1">Sign in to access the studio</p>
                        </div>
                    </div>

                    <form onSubmit={onSubmit} className="mt-8 space-y-5">
                        {error && (
                            <div className="rounded-xl border border-red-200 bg-red-50 text-[#1A4484] px-4 py-3 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Email Address</label>
                            <input
                                className="h-12 w-full rounded-xl border border-input bg-background/60 px-4 text-sm outline-none font-medium placeholder:text-muted-foreground focus:ring-2 focus:ring-[#1A4484] transition-shadow"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="writer@scgbsolutions.com"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Password</label>
                            <div className="relative">
                                <input
                                    className="h-12 w-full rounded-xl border border-input bg-background/60 px-4 pr-12 text-sm outline-none font-medium placeholder:text-muted-foreground focus:ring-2 focus:ring-[#1A4484] transition-shadow"
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
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-800"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    disabled={loading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-slate-400" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-slate-400" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-center pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="h-11 w-1/2 rounded-full bg-[#1A4484] text-white font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 transition-all shadow-[0_4px_14px_0_rgba(26,68,132,0.39)] hover:shadow-[0_6px_20px_rgba(26,68,132,0.23)] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? "Authenticating..." : "Enter Studio"}
                            </button>
                        </div>

                        <div className="pt-2 text-center text-sm text-muted-foreground font-medium">
                            Need publishing access?{" "}
                            <button type="button" className="font-bold text-slate-900 dark:text-slate-100 hover:text-[#1A4484] dark:hover:text-[#1A4484] transition-colors" disabled={loading}>
                                Contact Admin
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}