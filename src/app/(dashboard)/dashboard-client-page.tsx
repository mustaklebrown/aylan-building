"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Banknote, ShoppingCart, Package, ArrowRight, User, Calendar } from "lucide-react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Timeframe,
  filterByTimeframe,
  getChartDataForTimeframe,
} from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format-utils";

interface DashboardClientPageProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  sales: Array<{
    id: string;
    date: Date | string;
    customerName: string;
    productId: string;
    product: { name: string };
    price: number;
    quantity: number;
    agentId: string;
    agent: { id: string; name: string; email: string };
    status: string;
    shippingType?: string;
    shippingCity?: string | null;
    shippingAddress?: string | null;
    shippingFee?: number;
  }>;
  prospects: Array<{
    id: string;
    createdAt: Date | string;
    fullName: string;
    status: string;
    agentId: string;
    agent: { id: string; name: string; email: string };
  }>;
  commissions: Array<{
    id: string;
    date: Date | string;
    amount: number;
    agentId: string;
    status: string;
    saleId: string;
    sale: {
      customerName: string;
      quantity: number;
      price: number;
      product: { name: string };
    };
  }>;
  agents: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date | string;
  }>;
  products: Array<{
    id: string;
    name: string;
    stockAvailable: number;
    alertThreshold: number;
  }>;
}

const getStatusBadge = (status: string) => {
  switch (status.toUpperCase()) {
    case "PENDING":
    case "EN ATTENTE":
      return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 hover:bg-amber-500/20 text-[10px] font-semibold">En attente</Badge>;
    case "CONFIRMED":
    case "CONFIRMÉE":
      return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400 hover:bg-blue-500/20 text-[10px] font-semibold">Confirmée</Badge>;
    case "SHIPPED":
    case "EXPÉDIÉE":
      return <Badge className="bg-indigo-500/10 text-indigo-700 border-indigo-500/20 dark:text-indigo-400 hover:bg-indigo-500/20 text-[10px] font-semibold">Expédiée</Badge>;
    case "DELIVERED":
    case "LIVRÉE":
      return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-semibold">Livrée</Badge>;
    case "CANCELLED":
    case "ANNULÉE":
      return <Badge variant="destructive" className="bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400 hover:bg-rose-500/20 text-[10px] font-semibold">Annulée</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] font-semibold">{status}</Badge>;
  }
};

export function DashboardClientPage({
  user,
  sales,
  prospects,
  commissions,
  agents,
  products,
}: DashboardClientPageProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>("month");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isAgent = user.role === "AGENT";

  // Filter datasets based on selected timeframe
  const filteredSales = filterByTimeframe(sales, timeframe);
  const filteredProspects = filterByTimeframe(prospects, timeframe);
  const filteredCommissions = filterByTimeframe(commissions, timeframe);

  // Dynamic statistics calculations
  const totalRevenue = filteredSales.reduce((sum, item) => sum + item.price * item.quantity + (item.shippingFee || 0), 0);
  const productRevenue = filteredSales.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalShippingFees = filteredSales.reduce((sum, item) => sum + (item.shippingFee || 0), 0);
  const salesCount = filteredSales.length;
  const prospectsCount = filteredProspects.length;
  
  // Stock alerts are absolute levels, not filtered by time
  const stockAlerts = products.filter((p) => p.stockAvailable <= p.alertThreshold).length;

  // Chart data generation
  const chartData = getChartDataForTimeframe(filteredSales, timeframe);

  // Take last 5 recent sales within period (filteredSales is pre-sorted desc)
  const recentSalesList = filteredSales.slice(0, 5).map((sale) => ({
    id: sale.id,
    date: sale.date,
    customerName: sale.customerName,
    productName: sale.product.name,
    amount: sale.price * sale.quantity + (sale.shippingFee || 0),
    agentName: sale.agent.name,
    status: sale.status,
  }));

  return (
    <div className="flex-1 space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-heading">
            Tableau de bord
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ravi de vous revoir, <span className="font-bold text-foreground">{user.name}</span>{" "}
            <Badge variant="outline" className="ml-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-bold uppercase text-[9px]">
              {user.role}
            </Badge>
          </p>
        </div>

        {/* Timeframe Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <Select
            value={timeframe}
            onValueChange={(value) => setTimeframe((value as Timeframe) || "month")}
          >
            <SelectTrigger className="w-[180px] h-9 border-slate-200 bg-background shadow-sm hover:bg-slate-50 transition-colors">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois-ci</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
              <SelectItem value="all">Tout historique</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards with Glassmorphism and Hover translate */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-indigo-500/20 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Chiffre d'affaires</CardTitle>
            <Banknote className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="flex flex-col gap-0.5 mt-1">
              <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 font-medium">
                {isAgent ? "Vos ventes de la période" : "Chiffre d'affaires global de la période"}
              </p>
              {totalShippingFees > 0 && (
                <p className="text-[10px] text-slate-400 font-normal">
                  ({formatCurrency(productRevenue)} prod + {formatCurrency(totalShippingFees)} livr.)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-slate-200/50 dark:border-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ventes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {salesCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isAgent ? "Vos transactions conclues" : "Nombre total de ventes"}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-slate-200/50 dark:border-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Prospects</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {prospectsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isAgent ? "Vos contacts créés sur la période" : "Nouveaux prospects de la période"}
            </p>
          </CardContent>
        </Card>

        <Card className={`glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ${stockAlerts > 0 ? "border-red-500/20 bg-gradient-to-tr from-red-500/5 to-rose-500/5 dark:from-red-500/10 dark:to-rose-500/10" : "border-slate-200/50 dark:border-slate-800/50"}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-xs font-bold uppercase tracking-wider ${stockAlerts > 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>Alertes Stock</CardTitle>
            <Package className={`h-4 w-4 ${stockAlerts > 0 ? "text-red-500" : "text-slate-500"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-extrabold font-heading mt-1 ${stockAlerts > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
              {stockAlerts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stockAlerts > 0
                ? `${stockAlerts} produits sous le seuil critique`
                : "Tous les produits en stock"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart & Recent Sales Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4 glass-card hover:shadow-md transition-all duration-300 border-slate-200/50 dark:border-slate-800/50">
          <CardHeader>
            <CardTitle className="font-heading text-lg font-bold text-slate-800 dark:text-slate-100">Vue d'ensemble</CardTitle>
            <CardDescription>
              {isAgent ? "Évolution de votre chiffre d'affaires." : "Évolution des ventes globales de l'entreprise."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {isMounted ? (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800/60" />
                    <XAxis dataKey="name" className="text-[10px] font-bold text-slate-400" />
                    <YAxis className="text-[10px] font-bold text-slate-400" unit=" KMF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid rgba(226, 232, 240, 0.5)",
                        borderRadius: "8px",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
                      }}
                    />
                    <Bar dataKey="ventes" fill="url(#barGradient)" radius={[4, 4, 0, 0]} name="Ventes" />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#4f46e5" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
                Chargement du graphique...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales Feed */}
        <Card className="col-span-1 lg:col-span-3 glass-card hover:shadow-md transition-all duration-300 border-slate-200/50 dark:border-slate-800/50 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg font-bold text-slate-800 dark:text-slate-100">Ventes Récentes</CardTitle>
            <CardDescription>
              Les dernières transactions enregistrées sur la période.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {recentSalesList.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground py-12">
                Aucune vente sur cette période.
              </div>
            ) : (
              <div className="space-y-4">
                {recentSalesList.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-slate-900/60 flex items-center justify-center border border-indigo-100/30">
                        <User className="h-4 w-4 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{sale.customerName}</p>
                        <p className="text-[11px] text-slate-500">
                          {sale.productName} • par {sale.agentName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(sale.amount)}
                      </p>
                      <div className="mt-0.5">{getStatusBadge(sale.status)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {recentSalesList.length > 0 && (
            <div className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100/80 dark:border-slate-800/40 mt-auto text-center">
              <Link href="/sales" className="text-xs text-indigo-600 hover:text-indigo-700 font-bold hover:underline inline-flex items-center">
                Voir toutes les ventes <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Tele-agent Performance Table (Admin/Accountant Only) */}
      {!isAgent && (
        <Card className="glass-card hover:shadow-md transition-all duration-300 border-slate-200/50 dark:border-slate-800/50 mt-6">
          <CardHeader>
            <CardTitle className="font-heading text-lg font-bold text-slate-800 dark:text-slate-100">Performances des Téléconseillers</CardTitle>
            <CardDescription>
              Vue d'ensemble de l'activité et des performances de vos commerciaux sur la période sélectionnée.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-md border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                  <TableRow>
                    <TableHead className="font-bold">Agent</TableHead>
                    <TableHead className="text-center font-bold">Prospects</TableHead>
                    <TableHead className="text-center font-bold">Produits Vendus</TableHead>
                    <TableHead className="text-right font-bold">Chiffre d'Affaires</TableHead>
                    <TableHead className="text-right font-bold">Commissions Générées</TableHead>
                    <TableHead className="text-center font-bold">Taux de Conversion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                        Aucun agent commercial enregistré.
                      </TableCell>
                    </TableRow>
                  ) : (
                    agents.map((agent) => {
                      const agentSales = filteredSales.filter((s) => s.agentId === agent.id);
                      const agentProspects = filteredProspects.filter((p) => p.agentId === agent.id);
                      const agentCommissions = filteredCommissions.filter((c) => c.agentId === agent.id);

                      const totalP = agentProspects.length;
                      const convertedP = agentProspects.filter(
                        (p) => p.status === "CLIENT" || p.status === "CONFIRMED"
                      ).length;
                      const conversionRate = totalP > 0 ? (convertedP / totalP) * 100 : 0;

                      const agentRevenue = agentSales.reduce((sum, s) => sum + s.price * s.quantity, 0);
                      const agentCommissionsSum = agentCommissions.reduce((sum, c) => sum + c.amount, 0);
                      const agentProductsSold = agentSales.reduce((sum, s) => sum + s.quantity, 0);

                      return (
                        <TableRow key={agent.id} className="hover:bg-slate-50/30">
                          <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
                            <div>
                              <p className="font-bold">{agent.name}</p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">{agent.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-700 dark:text-slate-300">{totalP}</TableCell>
                          <TableCell className="text-center font-semibold text-slate-700 dark:text-slate-300">{agentProductsSold}</TableCell>
                          <TableCell className="text-right font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(agentRevenue)}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(agentCommissionsSum)}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${
                              conversionRate >= 20 
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                : conversionRate >= 10 
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" 
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                            } font-bold text-xs`}>
                              {conversionRate.toFixed(1)} %
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
