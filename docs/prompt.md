# Projet : Dashboard de Gestion Commerciale et de Stock

Tu es un Architecte Logiciel Senior, Expert en SaaS B2B, CRM, Gestion de Stock, Analytics et développement Full-Stack moderne.

Ta mission est de concevoir l'architecture complète d'une application web professionnelle destinée à gérer une entreprise de vente en ligne.

## Contexte de l'entreprise

Notre entreprise vend des produits en ligne.
nom de l entreprise:AYLAN GROUP
LOGO:./LOGO.jpeg

### Organisation

#### 1. Téléconseillers (Agents commerciaux)

Les téléconseillers sont chargés de :

- Prospecter des clients
- Enregistrer des prospects
- Contacter les prospects
- Assurer le suivi commercial
- Transformer les prospects en clients
- Réaliser des ventes
- Gagner des commissions variables selon les produits vendus

#### 2. Comptable

Le comptable est responsable de :

- La gestion du stock
- Le suivi des entrées et sorties
- La comptabilité
- Le suivi des ventes
- Le calcul des commissions des téléconseillers
- Les rapports financiers

---

# Stack technique obligatoire

- Next.js 16.2 (App Router)
- TypeScript
- Better Auth
- PostgreSQL
- Prisma ORM
- TailwindCSS
- Shadcn/UI
- React Hook Form
- Zod
- TanStack Query
- Vercel
- GitHub

Architecture propre, scalable et maintenable.

---

# Objectif principal

Développer un Dashboard centralisé permettant :

1. La gestion des stocks
2. La gestion des téléconseillers
3. Le suivi des prospects
4. Le suivi des ventes
5. Le calcul des commissions
6. L'analyse des performances commerciales via des KPI

---

# Gestion des utilisateurs

Prévoir plusieurs rôles :

### Administrateur

Accès total à toutes les fonctionnalités.

### Comptable

Accès :

- Stock
- Ventes
- Commissions
- Rapports
- Statistiques

### Téléconseiller

Accès uniquement à :

- Ses prospects
- Ses clients
- Ses ventes
- Ses commissions
- Ses statistiques personnelles

---

# Module CRM

## Gestion des prospects

Chaque prospect doit contenir :

- Nom complet
- Téléphone
- WhatsApp
- Adresse
- Ville
- Source du prospect
- Produit d'intérêt
- Commentaires
- Date de création

### Pipeline commercial

Les statuts possibles :

- Nouveau prospect
- Contacté
- Intéressé
- Relance prévue
- Négociation
- Commande confirmée
- Client
- Perdu

Afficher le pipeline sous forme de Kanban Drag & Drop.

---

# Module Produits

Pour chaque produit :

- Nom
- SKU
- Catégorie
- Description
- Prix d'achat
- Prix de vente
- Commission vendeur
- Stock disponible
- Seuil d'alerte

---

# Module Stock

Fonctionnalités :

### Entrées de stock

- Date
- Produit
- Quantité
- Fournisseur
- Coût

### Sorties de stock

- Vente
- Retour
- Perte
- Produit endommagé

### Alertes automatiques

- Stock faible
- Rupture de stock

---

# Module Ventes

Pour chaque vente :

- Produit
- Quantité
- Prix
- Client
- Téléconseiller
- Date
- Statut de livraison

Statuts :

- En attente
- Confirmée
- Expédiée
- Livrée
- Annulée

---

# Module Commissions

Calcul automatique des commissions.

Chaque produit possède sa propre commission.

Le système doit calculer :

- Commission par vente
- Commission quotidienne
- Commission hebdomadaire
- Commission mensuelle
- Commission totale

---

# Dashboard KPI Téléconseiller

Pour chaque téléconseiller afficher :

### Performance commerciale

- Nombre de prospects
- Nombre de prospects contactés
- Nombre de clients obtenus
- Nombre de ventes
- Chiffre d'affaires généré
- Taux de conversion
- Commission totale

### Graphiques

- Evolution des ventes
- Evolution des commissions
- Evolution du taux de conversion

---

# Dashboard Administrateur

Afficher :

### KPI globaux

- Chiffre d'affaires total
- Nombre total de ventes
- Nombre total de prospects
- Nombre de clients
- Valeur du stock
- Produits les plus vendus
- Meilleurs téléconseillers

### Rapports

- Journalier
- Hebdomadaire
- Mensuel
- Annuel

---

# Notifications

Prévoir :

- Notification de nouveau prospect
- Notification de vente
- Alerte de stock faible
- Alerte rupture de stock
- Notification commission générée

---

# Sécurité

- Authentification Better Auth
- RBAC (Role Based Access Control)
- Protection des routes
- Audit log des actions utilisateurs

---

# Livrables attendus

1. Architecture complète du projet
2. Structure des dossiers Next.js
3. Schéma Prisma complet
4. Diagramme des relations entre tables
5. Liste des API Routes
6. Design System Shadcn/UI
7. Pages et fonctionnalités détaillées
8. Plan d'implémentation étape par étape
9. Code prêt pour la production

Le résultat doit être conçu comme un SaaS professionnel moderne capable de gérer plusieurs téléconseillers, plusieurs produits et un volume important de ventes.
