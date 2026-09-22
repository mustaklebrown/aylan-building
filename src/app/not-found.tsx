'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FileQuestion, 
  ArrowLeft, 
  Home, 
  Package, 
  ShoppingCart, 
  Users, 
  User, 
  HelpCircle, 
  Search,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();

  const quickLinks = [
    {
      title: 'Catalogue Produits',
      description: 'Consulter les stocks et les fiches articles',
      href: '/products',
      icon: Package,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Ventes & Commandes',
      description: 'Suivre les livraisons et les transactions',
      href: '/sales',
      icon: ShoppingCart,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'CRM & Prospects',
      description: 'Gestion des prospects et téléconseillers',
      href: '/crm',
      icon: Users,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Mon Profil',
      description: 'Informations personnelles et paramètres',
      href: '/profile',
      icon: User,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
  ];

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0a1220] px-4 py-16 sm:px-6 lg:px-8 text-white">
      {/* Dynamic ambient gradients */}
      <div className="absolute top-1/4 left-1/3 -z-10 h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFA800]/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 -z-10 h-[450px] w-[450px] translate-x-1/2 translate-y-1/2 rounded-full bg-[#0B3DF5]/15 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-2xl mx-auto space-y-8 text-center">
        {/* Top badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-[#FFA800]/10 border border-[#FFA800]/30 px-3.5 py-1.5 text-xs font-semibold text-[#FFA800] shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-[#FFA800] animate-pulse" />
          ERREUR 404 • RESSOURCE INTROUVABLE
        </div>

        {/* Central Graphic Element */}
        <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-b from-[#0A1945] to-[#060F26] border border-white/10 shadow-2xl shadow-black/40">
          <FileQuestion className="h-14 w-14 text-[#FFA800] drop-shadow-[0_0_15px_rgba(255,168,0,0.35)]" />
          <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold">
            !
          </div>
        </div>

        {/* Headings */}
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl font-[var(--font-heading)]">
            Page Introuvable
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
            La page que vous recherchez n&apos;existe pas, a été renommée ou a été temporairement déplacée.
          </p>
        </div>

        {/* Explicit explanations box */}
        <div className="rounded-2xl bg-[#0A1945]/80 border border-white/10 p-6 text-left shadow-lg backdrop-blur-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#FFA800]">
            <HelpCircle className="h-4 w-4 shrink-0" />
            <span>Pourquoi voyez-vous ce message ?</span>
          </div>
          <ul className="text-xs sm:text-sm text-slate-300 space-y-2 pl-4 list-disc marker:text-[#FFA800]">
            <li>
              <strong className="text-white">Lien erroné ou faute de frappe :</strong> L&apos;adresse URL saisie dans la barre de navigation contient peut-être une erreur.
            </li>
            <li>
              <strong className="text-white">Ressource modifiée ou archivée :</strong> L&apos;identifiant de commande, de produit ou de prospect n&apos;est plus valide dans la base de données.
            </li>
            <li>
              <strong className="text-white">Restriction de privilège :</strong> Certains modules ne sont visibles qu&apos;en fonction du rôle connecté (Stockiste, Admin, Livreur, E-commerçant).
            </li>
          </ul>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white px-5 py-2.5 h-auto rounded-xl transition-all"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Page précédente
          </Button>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-[#FFA800] hover:bg-[#ffb726] text-[#060F26] font-bold px-6 py-2.5 text-sm shadow-lg shadow-[#FFA800]/25 transition-all"
          >
            <Home className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Link>
        </div>

        {/* Recommended destinations */}
        <div className="pt-6 border-t border-slate-800/80 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Raccourcis vers les sections principales
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-start gap-3.5 p-3.5 rounded-xl bg-[#0A1945]/50 border border-white/10 hover:border-[#FFA800]/40 hover:bg-[#0E225C]/70 transition-all duration-200"
                >
                  <div className={`p-2.5 rounded-lg border shrink-0 ${link.color} transition-transform group-hover:scale-110`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white group-hover:text-[#FFA800] transition-colors">
                        {link.title}
                      </span>
                      <ExternalLink className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {link.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-500">
          Dig e-com • Code 404 • Plateforme de Gestion E-commerce
        </div>
      </div>
    </main>
  );
}
