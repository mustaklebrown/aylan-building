"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import {
  Calculator,
  Users,
  TrendingUp,
  PieChart,
  Coins,
  Search,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format-utils";
import { exportToCSV } from "@/lib/export-utils";
import { InvoiceModal } from "@/components/invoice/invoice-modal";

interface LeaderSummary {
  id: string;
  name: string;
  email: string;
  agentCount: number;
  commonShare: number;
  specificGain: number;
  specificRevenue: number;
  totalGain: number;
}

interface SaleDetail {
  id: string;
  date: Date;
  productName: string;
  isCommon: boolean;
  leaderName: string;
  agentName: string;
  customerName: string;
  quantity: number;
  revenue: number;
  cost: number;
  commission: number;
  gain: number;
  status: string;
}

interface AccountingData {
  leaders: LeaderSummary[];
  totalCommonGain: number;
  totalCommonRevenue: number;
  commonSharePerLeader: number;
  totalSpecificGain: number;
  totalGain: number;
  totalRevenue: number;
  totalSalesCount: number;
  leaderCount: number;
  salesDetail: SaleDetail[];
}

interface AccountingClientPageProps {
  data: AccountingData;
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function AccountingClientPage({
  data,
  currentUser,
}: AccountingClientPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);

  const isLeader = currentUser.role === "LEADER";

  // Filter sales details
  const filteredSales = data.salesDetail.filter((s) => {
    const matchesSearch =
      s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "common" && s.isCommon) ||
      (typeFilter === "specific" && !s.isCommon);
    return matchesSearch && matchesType;
  });

  const handleExport = () => {
    exportToCSV(
      filteredSales,
      [
        "ID Vente",
        "Date",
        "Produit",
        "Type",
        "Leader/Affectation",
        "Agent",
        "Client",
        "Quantité",
        "CA (KMF)",
        "Coût (KMF)",
        "Commission (KMF)",
        "Gain Net (KMF)",
        "Statut",
      ],
      (s) => [
        s.id,
        formatDate(s.date),
        s.productName,
        s.isCommon ? "Commun" : "Spécifique",
        s.leaderName,
        s.agentName,
        s.customerName,
        s.quantity,
        s.revenue,
        s.cost,
        s.commission,
        s.gain,
        s.status,
      ],
      "comptabilite_aylan"
    );
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent font-heading">
            Comptabilité & Répartition
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isLeader
              ? "Consultez vos gains : part des produits communs + vos produits spécifiques."
              : "Vue consolidée des gains, répartitions entre leaders et comptabilité globale."}
          </p>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          className="border-slate-200 hover:bg-slate-50 font-medium"
        >
          <Download className="mr-2 h-4 w-4" /> Exporter en Excel
        </Button>
      </div>

      {/* Top-level KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-violet-500/20 bg-gradient-to-tr from-violet-500/5 to-purple-500/5 dark:from-violet-500/10 dark:to-purple-500/10 shadow-violet-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              Gain Total Net
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {formatCurrency(data.totalGain)}
            </div>
            <p className="text-xs text-violet-600/70 dark:text-violet-400/70 font-medium mt-1">
              Après déduction des coûts et commissions
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-blue-500/20 bg-gradient-to-tr from-blue-500/5 to-cyan-500/5 dark:from-blue-500/10 dark:to-cyan-500/10 shadow-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Gains Produits Communs
            </CardTitle>
            <PieChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {formatCurrency(data.totalCommonGain)}
            </div>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium mt-1">
              Répartis équitablement entre {data.leaderCount} leader{data.leaderCount > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-indigo-500/20 bg-gradient-to-tr from-indigo-500/5 to-violet-500/5 dark:from-indigo-500/10 dark:to-violet-500/10 shadow-indigo-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Gains Produits Spécifiques
            </CardTitle>
            <Coins className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {formatCurrency(data.totalSpecificGain)}
            </div>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 font-medium mt-1">
              Attribués au leader associé
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-slate-200/50 dark:border-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Ventes Validées
            </CardTitle>
            <Calculator className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {data.totalSalesCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              CA Total : {formatCurrency(data.totalRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leaders Summary Table */}
      <Card className="glass-card hover:shadow-md transition-all duration-300 border-slate-200/50 dark:border-slate-800/50">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-500" />
            Répartition par Leader
          </CardTitle>
          <CardDescription>
            Part des gains communs (répartition équitable) + gains des produits spécifiques.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                <TableRow>
                  <TableHead className="font-bold">Leader</TableHead>
                  <TableHead className="text-center font-bold">Agents</TableHead>
                  <TableHead className="text-right font-bold">Part Communs</TableHead>
                  <TableHead className="text-right font-bold">Gains Spécifiques</TableHead>
                  <TableHead className="text-right font-bold">Gain Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.leaders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400 text-sm">
                      Aucun leader enregistré. Créez un leader depuis la page Paramètres.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.leaders.map((leader) => (
                    <TableRow key={leader.id} className="hover:bg-slate-50/30">
                      <TableCell>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{leader.name}</p>
                          <p className="text-[10px] text-slate-400">{leader.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-bold text-xs">
                          {leader.agentCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(leader.commonShare)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-violet-600 dark:text-violet-400">
                          {formatCurrency(leader.specificGain)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-extrabold text-lg ${leader.totalGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {formatCurrency(leader.totalGain)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {/* Totals row */}
                {data.leaders.length > 0 && (
                  <TableRow className="bg-slate-50/80 dark:bg-slate-900/40 border-t-2 border-slate-200 dark:border-slate-700">
                    <TableCell className="font-extrabold text-slate-900 dark:text-white">TOTAL</TableCell>
                    <TableCell className="text-center font-bold text-slate-600">
                      {data.leaders.reduce((s, l) => s + l.agentCount, 0)}
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-blue-600 dark:text-blue-400">
                      {formatCurrency(data.totalCommonGain)}
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-violet-600 dark:text-violet-400">
                      {formatCurrency(data.totalSpecificGain)}
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-lg text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(data.totalGain)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Sales Detail Table */}
      <Card className="glass-card hover:shadow-md transition-all duration-300 border-slate-200/50 dark:border-slate-800/50">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold">Détail des Ventes Comptabilisées</CardTitle>
            <CardDescription>
              Toutes les ventes validées avec le calcul du gain net (CA - Coût - Commission).
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Produit, agent, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-background h-9 text-sm border-slate-200"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value || "all")}
            >
              <SelectTrigger className="w-[170px] h-9 border-slate-200">
                <SelectValue placeholder="Type de produit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="common">Produits Communs</SelectItem>
                <SelectItem value="specific">Produits Spécifiques</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border border-slate-100 dark:border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-center">Qté</TableHead>
                  <TableHead className="text-right">CA</TableHead>
                  <TableHead className="text-right">Coût</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Gain Net</TableHead>
                  <TableHead className="text-right">Facture</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-slate-400 text-sm">
                      Aucune vente validée trouvée.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-50/30">
                      <TableCell className="text-xs text-slate-400">
                        {formatDate(s.date)}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        {s.productName}
                      </TableCell>
                      <TableCell>
                        {s.isCommon ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 text-[10px] font-semibold">
                            Commun
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200 text-[10px] font-semibold">
                            {s.leaderName}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {s.agentName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {s.customerName}
                      </TableCell>
                      <TableCell className="text-center font-bold text-sm">
                        {s.quantity}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-600">
                        {formatCurrency(s.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-400">
                        {formatCurrency(s.cost)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-orange-600 dark:text-orange-400">
                        {formatCurrency(s.commission)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-extrabold ${s.gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {s.gain >= 0 ? "+" : ""}{formatCurrency(s.gain)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setActiveInvoice({
                              id: s.id,
                              date: s.date,
                              customerName: s.customerName,
                              productName: s.productName,
                              quantity: s.quantity,
                              price: s.revenue / (s.quantity || 1),
                              totalAmount: s.revenue,
                              agentName: s.agentName,
                              status: s.status,
                            })
                          }
                          className="h-7 text-xs font-semibold gap-1 border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                        >
                          <FileText className="h-3 w-3" />
                          <span>Facture</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={activeInvoice !== null}
        onClose={() => setActiveInvoice(null)}
        invoice={activeInvoice}
      />
    </div>
  );
}
