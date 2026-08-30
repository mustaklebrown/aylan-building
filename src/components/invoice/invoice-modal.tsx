"use client";

import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  FileText,
  Building2,
  Calendar,
  User,
  Phone,
  MapPin,
  Truck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Download,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format-utils";

export interface InvoiceItem {
  id: string;
  date: Date | string;
  customerName: string;
  customerPhone?: string | null;
  customerWhatsapp?: string | null;
  productName: string;
  productSku?: string | null;
  quantity: number;
  price: number;
  totalAmount: number;
  shippingFee?: number | null;
  shippingType?: string | null;
  shippingCity?: string | null;
  shippingAddress?: string | null;
  agentName?: string | null;
  sellerRole?: string | null;
  status?: string | null;
  stockisteName?: string | null;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceItem | null;
}

export function InvoiceModal({ isOpen, onClose, invoice }: InvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const invoiceNumber = `FACT-${new Date(invoice.date).getFullYear()}-${invoice.id.slice(-6).toUpperCase()}`;
  const subtotal = invoice.price * invoice.quantity;
  const shippingFee = invoice.shippingFee || 0;
  const total = subtotal + shippingFee;

  const isDelivered = invoice.status === "DELIVERED" || invoice.status === "LIVRÉE";
  const isConfirmed = invoice.status === "CONFIRMED" || invoice.status === "SHIPPED" || isDelivered;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] w-[95vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl print:p-0 print:border-none print:shadow-none">
        <DialogHeader className="print:hidden pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <FileText className="h-5 w-5 text-indigo-600" />
              Facture Client Officielle
            </DialogTitle>
            <Badge
              className={
                isDelivered
                  ? "bg-emerald-600 text-white font-bold"
                  : isConfirmed
                  ? "bg-blue-600 text-white font-bold"
                  : "bg-amber-500 text-white font-bold"
              }
            >
              {isDelivered ? "PAYÉE / LIVRÉE" : isConfirmed ? "VALIDÉE" : "EN ATTENTE"}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Document certifié édité pour la comptabilité et l'administration AYLAN GROUP.
          </DialogDescription>
        </DialogHeader>

        {/* Facture Printable Document */}
        <div
          ref={printRef}
          id="printable-invoice"
          className="bg-white text-slate-900 rounded-xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-6 text-sm print:m-0 print:p-6 print:border-none print:shadow-none"
        >
          {/* Header de l'entreprise */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
                  A
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900">AYLAN GROUP</h1>
                  <p className="text-[11px] font-semibold text-indigo-600 tracking-wide uppercase">
                    Centrale Commerciale & Logistique
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Moroni, Grande Comore • Union des Comores<br />
                Tél : +269 333 00 00 / +269 444 00 00<br />
                Email : contact@aylangroup.com
              </p>
            </div>

            <div className="sm:text-right bg-slate-50 p-3 rounded-lg border border-slate-100 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Facture N°</span>
              <span className="text-base font-black text-indigo-600 font-mono">{invoiceNumber}</span>
              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                <p>Date : <strong>{formatDate(invoice.date)}</strong></p>
                <p>Échéance : <strong>À réception</strong></p>
              </div>
            </div>
          </div>

          {/* Section Client & Vente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/70 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <User className="h-3 w-3 text-indigo-600" /> Facturé à (Client)
              </span>
              <p className="text-sm font-bold text-slate-900">{invoice.customerName || "Client de passage"}</p>
              {invoice.customerPhone && invoice.customerPhone !== "Non spécifié" && (
                <p className="text-xs flex items-center gap-1 text-slate-600 font-mono">
                  <Phone className="h-3 w-3 text-slate-400" /> {invoice.customerPhone}
                </p>
              )}
              {invoice.shippingAddress && (
                <p className="text-xs flex items-center gap-1 text-slate-600">
                  <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                  <span>{invoice.shippingAddress} ({invoice.shippingCity || "Moroni"})</span>
                </p>
              )}
            </div>

            <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/70 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Truck className="h-3 w-3 text-indigo-600" /> Mode de distribution & Agent
              </span>
              <p className="text-xs text-slate-700">
                Mode : <strong className="text-indigo-600 font-semibold">{invoice.shippingType === "DELIVERY" ? "Livraison à domicile" : "Retrait en magasin / Relais"}</strong>
              </p>
              <p className="text-xs text-slate-700">
                Commercial / Agent : <strong className="font-semibold text-slate-900">{invoice.agentName || "Administration"}</strong>
              </p>
              {invoice.stockisteName && (
                <p className="text-xs text-slate-500">
                  Stockiste source : <span className="font-medium text-slate-700">{invoice.stockisteName}</span>
                </p>
              )}
            </div>
          </div>

          {/* Tableau des Lignes de Facture */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Désignation</th>
                  <th className="p-3 text-center">Qté</th>
                  <th className="p-3 text-right">Prix Unitaire</th>
                  <th className="p-3 text-right">Montant Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-3">
                    <p className="font-bold text-slate-900 text-sm">{invoice.productName}</p>
                    {invoice.productSku && (
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Réf: {invoice.productSku}</p>
                    )}
                  </td>
                  <td className="p-3 text-center font-bold text-slate-800 text-sm">{invoice.quantity}</td>
                  <td className="p-3 text-right font-medium text-slate-600">{formatCurrency(invoice.price)}</td>
                  <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(subtotal)}</td>
                </tr>

                {shippingFee > 0 && (
                  <tr className="bg-slate-50/50 text-slate-600">
                    <td className="p-2.5 pl-3">
                      <span className="font-medium">Frais d'expédition & Livraison ({invoice.shippingCity || "Moroni"})</span>
                    </td>
                    <td className="p-2.5 text-center font-semibold">1</td>
                    <td className="p-2.5 text-right">{formatCurrency(shippingFee)}</td>
                    <td className="p-2.5 text-right font-semibold">{formatCurrency(shippingFee)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totaux & Règlement */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
            <div className="space-y-1 text-xs text-slate-500">
              <p className="flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5" /> Paiement sécurisé & Garantie AYLAN GROUP
              </p>
              <p className="text-[10px] text-slate-400">
                TVA non applicable - Article Régime PME / Produits enregistrés
              </p>
            </div>

            <div className="w-full sm:w-60 bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Sous-total HT :</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {shippingFee > 0 && (
                <div className="flex justify-between text-xs text-slate-600 font-medium">
                  <span>Frais de port :</span>
                  <span>{formatCurrency(shippingFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-2 text-indigo-900">
                <span>NET À PAYER :</span>
                <span className="text-base text-indigo-600 font-black">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Cachet & Signature */}
          <div className="border-t border-dashed border-slate-200 pt-4 flex justify-between items-end">
            <div className="text-[10px] text-slate-400 leading-tight">
              Merci pour votre confiance !<br />
              Pour toute réclamation : service.client@aylangroup.com
            </div>

            <div className="text-center p-2.5 border border-indigo-100 rounded-lg bg-indigo-50/40">
              <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">Cachet & Validation</div>
              <div className="text-[11px] font-black text-indigo-900 mt-1">AYLAN GROUP COMORES</div>
              <div className="text-[8px] text-slate-400 font-mono mt-0.5">Approuvé Direction Financière</div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <DialogFooter className="print:hidden pt-3 gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto h-11 sm:h-10 text-sm font-medium">
            Fermer
          </Button>
          <Button
            onClick={handlePrint}
            className="w-full sm:w-auto h-11 sm:h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimer la Facture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
