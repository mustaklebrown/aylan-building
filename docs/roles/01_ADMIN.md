# 👑 Rôle 1 : Administrateur (`ADMIN`)

## 1. Description Générale
L'**Administrateur** dispose des droits suprêmes sur l'ensemble de la plateforme AYLAN GROUP. Il a pour mission de structurer l'entreprise, créer et configurer tous les comptes utilisateurs, valider le catalogue produit global, superviser les performances commerciales consolidées et auditer toutes les transactions sensibles.

---

## 2. Accès & Permissions Principales

- **Gestion globale des utilisateurs** :
  - Création, modification et désactivation des comptes pour tous les rôles (`ADMIN`, `ACCOUNTANT`, `STOCKISTE`, `LEADER`, `AGENT`, `ECOMMERCANT`, `DELIVERY_ASSISTANT`, `DELIVERY`).
  - Rattachement des téléconseillers (`AGENT`) à leurs **Leaders** respectifs pour organiser les équipes commerciales.
- **Gestion du Catalogue Global** :
  - Création et modification de tous les produits.
  - Attribution des produits à des Stockistes spécifiques ou définition en tant que produit commun.
  - Configuration des prix d'achat, de vente, des seuils d'alerte et des grilles de commissions à 3 paliers.
- **Tableau de Bord Exécutif Consolidé** :
  - Chiffre d'affaires global de l'entreprise en temps réel.
  - Volume total de ventes, taux de conversion des prospects, valeur totale du stock.
  - Classement et indicateurs de performance de tous les commerciaux et leaders.
- **Supervision Comptable & Logs d'Audit** :
  - Consultation de la répartition des bénéfices entre Leaders et Stockistes.
  - Consultation et filtrage des **Audit Logs** (traçabilité de toutes les créations, modifications de statuts, paiements de commissions).

---

## 3. Exemple Concret de Workflow Quotidien

### 📌 Scénario : Intégration d'un nouveau Leader et de son équipe
1. **Étape 1 : Création du compte Leader**
   - L'Admin va sur la page **Commerciaux & Utilisateurs** (`/agents`).
   - Clique sur **« Nouveau Commercial / Utilisateur »**.
   - Renseigne : *Nom : Mohamed Leader Sud*, *Email : mohamed.sud@aylan.com*, *Rôle : LEADER*.
2. **Étape 2 : Création et rattachement des agents**
   - L'Admin crée un compte : *Nom : Paul Téléconseiller*, *Rôle : AGENT*, *Leader rattaché : Mohamed Leader Sud*.
3. **Étape 3 : Affectation d'un produit dédié (optionnel)**
   - L'Admin crée un produit spécifique pour l'équipe Sud et configure la commission Leader et Téléconseiller.
4. **Étape 4 : Suivi en direct**
   - L'Admin suit en temps réel les ventes conclues par l'équipe Sud depuis son tableau de bord d'accueil.
