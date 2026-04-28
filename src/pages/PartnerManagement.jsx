import { useEffect, useState } from "react";
import StickySearchHeader from "@/components/StickySearchHeader";
import { Users, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Building2, User } from "lucide-react"
import { api } from '@/utils/Api';

export default function PartnerManagement() {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const [form, setForm] = useState({
        name: "",
        email: "",
        mobileNumber: "",
        password: "",
    });

    const fetchPartners = async () => {
        try {
            const res = await api.get("/api/users/partners");
            setPartners(res.data.data || []);
        } catch (err) {
            console.error("Failed to load partners", err);
        }
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const createPartner = async () => {
        try {
            setLoading(true);

            const payload = {
                ...form,
                mobileNumber: form.mobileNumber.startsWith("+91")
                    ? form.mobileNumber
                    : `+91${form.mobileNumber}`,
            };

            await api.post("/api/users/partners", payload);

            setForm({
                name: "",
                email: "",
                mobileNumber: "",
                password: "",
                companyName: "",
            });

            setOpen(false);
            fetchPartners();

        } catch (err) {
            alert(err?.response?.data?.message || "Error creating partner");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen">
            <StickySearchHeader />
            <div className="container mx-auto p-6 space-y-6">

                {/* Page Heading */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Partners</h1>
                        <p className="text-sm sm:text-base text-muted-foreground">
                            Manage and create referral partners
                        </p>
                    </div>

                    {/* Add Partner Button */}
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button> <UserPlus className="h-4 w-4" /> Add Partner</Button>
                        </DialogTrigger>

                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Create Partner</DialogTitle>
                            </DialogHeader>

                            <Separator />

                            <div className="space-y-4">

                                <Input
                                    name="name"
                                    placeholder="Partner Name"
                                    value={form.name}
                                    onChange={handleChange}
                                />

                                <Input
                                    name="email"
                                    placeholder="Email"
                                    value={form.email}
                                    onChange={handleChange}
                                />

                                <Input
                                    name="companyName"
                                    placeholder="Company Name"
                                    value={form.companyName}
                                    onChange={handleChange}
                                />

                                <Input
                                    name="mobileNumber"
                                    placeholder="Mobile Number"
                                    value={form.mobileNumber}
                                    onChange={handleChange}
                                />

                                <Input
                                    name="password"
                                    type="password"
                                    placeholder="Password"
                                    value={form.password}
                                    onChange={handleChange}
                                />

                                <Button
                                    className="w-full"
                                    onClick={createPartner}
                                    disabled={loading}
                                >
                                    {loading ? "Creating..." : "Create Partner"}
                                </Button>

                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Partners Section */}
                {partners.length === 0 ? (
                    <Card className="border-dashed transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/40">

                        <CardHeader className="flex flex-col items-center text-center gap-2">

                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted transition-colors duration-300 group-hover:bg-primary/10">
                                <Users className="h-6 w-6 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
                            </div>

                            <CardTitle className="transition-colors duration-300">
                                No Partners Found
                            </CardTitle>

                        </CardHeader>

                        <CardContent className="flex flex-col items-center justify-center gap-4 pb-10">

                            <p className="text-sm text-muted-foreground text-center max-w-sm">
                                There are no partners created yet. Start by adding your first partner.
                            </p>

                            <Button
                                onClick={() => setOpen(true)}
                                className="gap-2 transition-all duration-200 hover:scale-105"
                            >
                                <UserPlus className="h-4 w-4" />
                                Add Partner
                            </Button>

                        </CardContent>

                    </Card>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {partners.map((partner) => (
                            <Card
                                key={partner._id}
                                className="group border border-border hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-background"
                            >
                                <CardHeader className="flex flex-row items-center gap-3 pb-3">

                                    {/* Avatar */}
                                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 group-hover:bg-primary/20 transition">
                                        <User className="h-5 w-5 text-primary" />
                                    </div>

                                    <div className="flex flex-col">
                                        <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                                            {partner.name}
                                        </CardTitle>

                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <Mail className="h-3.5 w-3.5" />
                                            {partner.email}
                                        </div>
                                    </div>

                                </CardHeader>

                                <Separator />

                                <CardContent className="space-y-3 pt-4 text-sm">

                                    {/* Company */}
                                    <div className="flex items-center justify-between border rounded-md px-3 py-2 bg-muted/20">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Building2 className="h-4 w-4" />
                                            Company
                                        </div>
                                        <span className="font-medium text-foreground">
                                            {partner.companyName || "—"}
                                        </span>
                                    </div>

                                    {/* Mobile */}
                                    <div className="flex items-center justify-between border rounded-md px-3 py-2 bg-muted/20">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Phone className="h-4 w-4" />
                                            Mobile
                                        </div>
                                        <span className="font-medium text-foreground">
                                            {partner.mobileNumber}
                                        </span>
                                    </div>

                                    {/* Status */}
                                    <div className="flex justify-end pt-1">
                                        <Badge
                                            className={
                                                partner.signupStatus === "Accepted"
                                                    ? "bg-green-100 text-green-700 border border-green-200"
                                                    : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                            }
                                        >
                                            {partner.signupStatus}
                                        </Badge>
                                    </div>

                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
}