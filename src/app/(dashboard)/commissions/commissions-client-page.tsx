"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Banknote,
  Search,
  CheckCircle,
  Clock,
  Coins,
  TrendingUp,
  User,
  Filter,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { payCommissionAction } from "@/server/actions/commission-actions";
import { Timeframe, filterByTimeframe } from "@/lib/date-utils";
import { formatCurrency, formatDate } from "@/lib/format-utils";
import { exportToCSV } from "@/lib/export-utils";

interface Commission {
  id: string;
  date: Date;
  amount: number;
  status: string;
  agentName: string;
  agentEmail: string;
  agentId: string;
  saleId: string;
  customerName: string;
  productName: string;
  saleTotal: number;
}

interface CommissionsClientPageProps {
  initialCommissions: Commission[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function CommissionsClientPage({
  initialCommissions,
  currentUser,
}: CommissionsClientPageProps) {
  const [commissions, setCommissions] = useState<Commission[]>(initialCommissions);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const canPay = currentUser.role === "ADMIN" || currentUser.role === "ACCOUNTANT";
  const isAgent = currentUser.role === "AGENT";

  // Filters
  const timeframeCommissions = filterByTimeframe(commissions, timeframe);

  const filteredCommissions = timeframeCommissions.filter((c) => {
    const matchesSearch =
      c.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Derived Summary
  const now = new Date();
  const commissionsMonth = commissions
    .filter((c) => {
      const cDate = new Date(c.date);
      return cDate.getMonth() === now.getMonth() && cDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, c) => sum + c.amount, 0);

  const commissionsPending = timeframeCommissions
    .filter((c) => c.status === "PENDING")
    .reduce((sum, c) => sum + c.amount, 0);

  const commissionsPaid = timeframeCommissions
    .filter((c) => c.status === "PAID")
    .reduce((sum, c) => sum + c.amount, 0);

  const commissionsTotal = timeframeCommissions.reduce((sum, c) => sum + c.amount, 0);

  const summary = {
    commissionsMonth,
    commissionsPending,
    commissionsPaid,
    commissionsTotal,
  };

  const handlePayCommission = async (id: string) => {
    setUpdatingId(id);
    try {
      const res = await payCommissionAction(id);
      if (res.success) {
        toast.success("Paiement de la commission validé !");
        
        // Update local list state
        const updated = commissions.map((c) => {
          if (c.id === id) {
            return { ...c, status: "PAID" };
          }
          return c;
        });
        setCommissions(updated);
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExport = () => {
    exportToCSV(
      filteredCommissions,
      [
        "ID Commission",
        "Date",
        "Agent",
        "Email Agent",
        "ID Agent",
        "ID Vente",
        "Client Vente",
        "Produit Vente",
        "Montant Vente (KMF)",
        "Montant Commission (KMF)",
        "Statut Commission",
      ],
      (c) => [
        c.id,
        formatDate(c.date),
        c.agentName,
        c.agentEmail,
        c.agentId,
        c.saleId,
        c.customerName,
        c.productName,
        c.saleTotal,
        c.amount,
        c.status === "PAID" ? "Payee" : "En attente",
      ],
      "commissions_aylan"
    );
  };

  return (    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-heading">
            Suivi des Commissions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isAgent
              ? "Consultez le détail de vos gains et commissions sur vos ventes."
              : "Suivez les commissions dues aux agents, valisez les versements et visualisez les totaux."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleExport}
            variant="outline"
            className="border-slate-200 hover:bg-slate-50 font-medium"
          >
            <Download className="mr-2 h-4 w-4" /> Exporter en Excel
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-indigo-500/20 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 shadow-indigo-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Commissions ce Mois</CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {formatCurrency(summary.commissionsMonth)}
            </div>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 font-medium mt-1">Cumulé sur le mois en cours</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-yellow-500/20 bg-gradient-to-tr from-yellow-500/5 to-amber-500/5 dark:from-yellow-500/10 dark:to-amber-500/10 shadow-yellow-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">En Attente de Paiement</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {formatCurrency(summary.commissionsPending)}
            </div>
            <p className="text-xs text-yellow-600/70 dark:text-yellow-400/70 font-medium mt-1">À reverser aux téléconseillers</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-emerald-500/20 bg-gradient-to-tr from-emerald-500/5 to-green-500/5 dark:from-emerald-500/10 dark:to-green-500/10 shadow-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Validé & Payé</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {formatCurrency(summary.commissionsPaid)}
            </div>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-medium mt-1">Versements comptabilisés</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-slate-200/50 dark:border-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Historique</CardTitle>
            <Coins className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {formatCurrency(summary.commissionsTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Somme de toutes les ventes</p>
          </CardContent>
        </Card>
      </div>

      {/* Commissions Table */}
      <Card className="glass-card hover:shadow-md transition-all duration-300 border-slate-200/50 dark:border-slate-800/50">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold">Registre des Règlements</CardTitle>
            <CardDescription>Consultez et validez les commissions générées par vente.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Agent, client, produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-background h-9 text-sm border-slate-200"
              />
            </div>
            <Select
              value={timeframe}
              onValueChange={(value) => setTimeframe((value as Timeframe) || "month")}
            >
              <SelectTrigger className="w-[150px] h-9 border-slate-200">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois-ci</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
                <SelectItem value="all">Tous les temps</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value || "all")}
            >
              <SelectTrigger className="w-[150px] h-9 border-slate-200">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="PENDING">En attente (Pending)</SelectItem>
                <SelectItem value="PAID">Payée (Paid)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Téléconseiller</TableHead>
                  <TableHead>Détails Commande</TableHead>
                  <TableHead className="text-right">Montant Vente</TableHead>
                  <TableHead className="text-right">Commission Dûe</TableHead>
                  <TableHead>Statut</TableHead>
                  {canPay && <TableHead className="text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canPay ? 7 : 6} className="text-center py-8 text-slate-400 text-sm">
                      Aucune commission trouvée.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCommissions.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50/30">
                      <TableCell className="text-xs text-slate-400">
                        {formatDate(c.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{c.agentName}</span>
                          <span className="text-[10px] text-slate-400">{c.agentEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-semibold">{c.productName}</span> • Client : {c.customerName}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-500">
                        {formatCurrency(c.saleTotal)}
                      </TableCell>
                      <TableCell className="text-right font-black text-emerald-600">
                        {formatCurrency(c.amount)}
                      </TableCell>
                      <TableCell>
                        {c.status === "PAID" ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200">Réglée</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200">En attente</Badge>
                        )}
                      </TableCell>
                      {canPay && (
                        <TableCell className="text-right">
                          {c.status === "PENDING" ? (
                            <Button
                              onClick={() => handlePayCommission(c.id)}
                              disabled={updatingId === c.id}
                              size="xs"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm text-xs h-7 py-1 px-2.5"
                            >
                              Valider le paiement
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Validé par le comptable</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
