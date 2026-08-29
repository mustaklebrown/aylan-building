# 📋 Rôle 7 : Assistant Livraisons (`DELIVERY_ASSISTANT`)

## 1. Description Générale
L'**Assistant Livraisons** (ou Superviseur Logistique) est le chef d'orchestre des expéditions de commandes. Il réceptionne toutes les ventes demandant un transport, prépare les colis au dépôt, filtre par zone géographique, assigne les courses aux livreurs disponibles et suit l'état d'avancement des colis jusqu'à la livraison finale.

---

## 2. Accès & Permissions Principales

- **Tour de Contrôle des Expéditions** :
  - Visualisation de l'ensemble des commandes avec mode de livraison `DELIVERY`.
  - Filtres multi-critères : Par ville (*Moroni, Grande Comore, Anjouan, Mohéli*), par statut (*En attente, Confirmée, En route, Livrée, Annulée*) et par livreur assigné.
- **Gestion des Affectations & Statuts** :
  - Assigner manuellement une commande à un livreur spécifique ou la laisser disponible pour prise en charge automatique.
  - Mettre à jour le statut des colis si nécessaire (`CONFIRMED` $\rightarrow$ `SHIPPED` $\rightarrow$ `DELIVERED` ou `CANCELLED`).
  - Gérer les retours et les annulations de livraison (qui recréditent automatiquement les stocks).
- **Édition des Documents Logistiques** :
  - Génération et impression des **Bordereaux de Livraison** individuels (avec détails client, téléphone, montant à encaisser).
  - Génération de la **Feuille de Route Quotidienne (Runsheet)** pour les livreurs.

---

## 3. Exemple Concret de Workflow

### 📌 Scénario : Organisation de la tournée du matin à Moroni
1. **Étape 1 : Filtrage des commandes du jour**
   - L'assistant logistique se rend sur la page **Livraisons** (`/deliveries`).
   - Il filtre : *Ville : Moroni*, *Statut : En attente (`PENDING`)* $\rightarrow$ 8 commandes prêtes.
2. **Étape 2 : Impression des bordereaux et feuille de route**
   - Il sélectionne les 8 commandes et clique sur **« Imprimer la feuille de route »**.
3. **Étape 3 : Attribution aux livreurs**
   - Il constate que le livreur Ali est disponible (`isAvailable = true`).
   - Les commandes sont confirmées et diffusées aux livreurs pour prise en charge.
4. **Étape 4 : Suivi des livraisons**
   - L'assistant voit en direct le statut de chaque commande passer au vert (`DELIVERED`) au fur et à mesure des dépôts.
