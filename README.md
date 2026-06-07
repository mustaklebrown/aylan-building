# Aylan Building CRM & ERP

Plateforme de gestion complète pour Aylan Building : 
- **CRM** : Gestion des prospects, suivi du tunnel de conversion (Nouveau, Intéressé, Client, etc.).
- **Ventes** : Enregistrement des ventes liées aux prospects, avec gestion automatique des stocks.
- **Produits** : Catalogue produits avec gestion des stocks, seuils d'alerte, prix d'achat/vente, et historique des mouvements.
- **Commissions** : Calcul automatique des commissions pour les téléconseillers.
- **Gestion des Rôles** : Contrôle d'accès granulaire (Admin, Comptable, Agent).

## Déploiement

Ce projet est prêt à être déployé sur **Vercel** ou tout autre hébergeur compatible avec Next.js.
Assurez-vous de définir les variables d'environnement suivantes lors du déploiement :
- `DATABASE_URL` : URL de connexion de la base de données PostgreSQL.
- `BETTER_AUTH_URL` : URL publique de votre application.
- `BETTER_AUTH_SECRET` : Clé secrète pour sécuriser les sessions d'authentification.

## Technologies
- **Framework** : Next.js 16 (App Router)
- **Base de données** : PostgreSQL via Prisma ORM
- **Authentification** : Better Auth
- **UI** : Tailwind CSS, shadcn/ui, Lucide Icons
