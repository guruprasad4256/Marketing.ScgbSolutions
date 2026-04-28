import { useEffect, useState } from "react";
import { api } from "@/utils/Api";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import StickySearchHeader from "@/components/StickySearchHeader";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Users,
    Target,
    TrendingUp,
    DollarSign,
    UserCheck
} from "lucide-react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddLeadModal from '@/components/AddLeadModal';
import useUser from "@/hooks/useUser";

export default function PartnerDashboard() {

    const [dashboard, setDashboard] = useState(null);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddLeadModal, setShowAddLeadModal] = useState(false);
    const { user } = useUser();

    /* Fetch Dashboard Data */
    const fetchDashboard = async () => {
        if (!user?.email) return;

        try {
            const res = await api.get(
                `/api/leads/partner/${user.email}`,
                { withCredentials: true }
            );

            const leadsData = res.data?.data || [];

            const activeLeads = leadsData.filter(
                (l) => l.Stage && l.Stage !== "Closed"
            ).length;

            const closedLeads = leadsData.filter(
                (l) => l.Stage === "Closed"
            ).length;

            setDashboard({
                totalLeads: leadsData.length,
                activeLeads,
                closedLeads,
                earnings: closedLeads * 1000,
                performanceScore:
                    leadsData.length > 0
                        ? Math.round((closedLeads / leadsData.length) * 100)
                        : 0
            });

            setLeads(leadsData);

        } catch (err) {
            console.error("Dashboard fetch error", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.email) {
            fetchDashboard();
        }
    }, [user]);

    const handleAddLeadSuccess = async () => {
        setShowAddLeadModal(false);
        await fetchDashboard();
    };

    const handleAddNewRow = () => setShowAddLeadModal(true);

    /* Loading Skeleton */
    if (loading) {
        return (
            <div className="p-8 space-y-6">

                <Skeleton className="h-20 w-full rounded-xl" />

                <div className="grid md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-28 rounded-xl" />
                    ))}
                </div>

                <Skeleton className="h-72 rounded-xl" />

            </div>
        );
    }

    const {
        totalLeads = 0,
        activeLeads = 0,
        closedLeads = 0,
        earnings = 0,
        performanceScore = 0
    } = dashboard || {};

    return (
        <div className="min-h-screen">
            <StickySearchHeader />
            <div className="container mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Partner Dashboard
                        </h1>
                        <p className="text-muted-foreground">
                            Track your leads performance and earnings
                        </p>
                    </div>
                    <Button onClick={handleAddNewRow} variant="default"><Plus className="mr-2 h-4 w-4" />Add New Lead</Button>
                </div>

                {/* KPI Cards */}
                <div className="grid md:grid-cols-5 gap-6">

                    <StatCard
                        title="Total Leads"
                        value={totalLeads}
                        icon={<Users className="text-primary" />}
                    />

                    <StatCard
                        title="Active Leads"
                        value={activeLeads}
                        icon={<Target className="text-primary" />}
                    />

                    <StatCard
                        title="Closed Leads"
                        value={closedLeads}
                        icon={<UserCheck className="text-primary" />}
                    />

                    <StatCard
                        title="Earnings"
                        value={`₹ ${earnings}`}
                        icon={<DollarSign className="text-primary" />}
                    />

                    <StatCard
                        title="Performance Score"
                        value={`${performanceScore}%`}
                        icon={<TrendingUp className="text-primary" />}
                    />

                </div>

                {/* Leads Table */}
                <Card className="p-6">

                    <CardTitle className="mb-6">
                        My Leads
                    </CardTitle>

                    {leads.length === 0 ? (
                        <p className="text-center text-muted-foreground py-12">
                            No leads submitted yet
                        </p>
                    ) : (
                        <Card className="p-0 overflow-hidden rounded-xl border">

                            <div className="overflow-x-auto">

                                <Table className="w-full">

                                    {/* Header */}
                                    <TableHeader className="bg-primary text-primary-foreground">
                                        <TableRow>

                                            <TableHead className="rounded-tl-xl text-primary-foreground">
                                                Name
                                            </TableHead>

                                            <TableHead className="text-primary-foreground">
                                                Email
                                            </TableHead>

                                            <TableHead className="text-primary-foreground">
                                                Company Name
                                            </TableHead>

                                            <TableHead className="text-primary-foreground">
                                                Phone
                                            </TableHead>

                                            <TableHead className="text-primary-foreground">
                                                Objection
                                            </TableHead>

                                            <TableHead className="rounded-tr-xl text-primary-foreground">
                                                Status
                                            </TableHead>

                                        </TableRow>
                                    </TableHeader>

                                    {/* Body */}
                                    <TableBody>

                                        {leads.map((lead) => (
                                            <TableRow
                                                key={lead._rowNumber}
                                                className="hover:bg-secondary/40 transition-colors"
                                            >

                                                <TableCell className="font-medium">
                                                    {lead["Name"]}
                                                </TableCell>

                                                <TableCell>
                                                    {lead["Email"]}
                                                </TableCell>

                                                <TableCell>
                                                    {lead["Company Name"]}
                                                </TableCell>

                                                <TableCell>
                                                    {lead["Phone"]}
                                                </TableCell>

                                                <TableCell>
                                                    {lead["Objection"]}
                                                </TableCell>

                                                <TableCell>

                                                    <Badge
                                                        variant={
                                                            lead.Stage === "Closed"
                                                                ? "default"
                                                                : lead.Stage === "In Progress"
                                                                    ? "secondary"
                                                                    : "outline"
                                                        }
                                                    >
                                                        {lead.Stage || "Not Updated"}
                                                    </Badge>

                                                </TableCell>

                                            </TableRow>
                                        ))}

                                    </TableBody>

                                </Table>

                            </div>

                        </Card>
                    )}
                </Card>
                <AddLeadModal open={showAddLeadModal} onClose={() => setShowAddLeadModal(false)} onSuccess={handleAddLeadSuccess} />

            </div>
        </div>
    );
}

/* KPI Card Component */

function StatCard({ title, value, icon, highlight }) {
    return (
        <Card
            className={`transition hover:shadow-lg ${highlight ? "bg-primary text-primary-foreground" : ""
                }`}
        >
            <CardContent className="flex items-center gap-4 p-6">

                {icon}

                <div>
                    <p className="text-sm opacity-80">{title}</p>
                    <h2 className="text-2xl font-bold">{value}</h2>
                </div>

            </CardContent>
        </Card>
    );
}