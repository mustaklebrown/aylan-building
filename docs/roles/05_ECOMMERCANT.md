# 🛒 Rôle 5 : E-commerçant Indépendant (`ECOMMERCANT`)

## 1. Description Générale
L'**E-commerçant** est un vendeur indépendant opérant sur ses propres canaux digitaux (boutiques en ligne, réseaux sociaux, TikTok, WhatsApp Business). Il n'est rattaché à aucun Leader, conserve une autonomie totale et bénéficie d'une commission directe majorée (`ecommercantCommission`) sur chaque vente enregistrée.

---

## 2. Accès & Permissions Principales

- **Indépendance Hiérarchique** :
  - Compte autonome sans chef d'équipe (`leaderId = null`).
  - Les commissions générées lui reviennent intégralement (aucune commission Leader prélevée).
- **Catalogue Dédié & Autorisé** :
  - Accès immédiat à tous les produits configurés avec `allowAllEcommercants = true` ou spécifiquement assignés à son compte.
  - Visualisation des commissions unitaires dédiées aux e-commerçants.
- **Enregistrement des Commandes Clients** :
  - Saisie des commandes avec les coordonnées complètes du client et choix du mode de livraison.
  - Possibilité de spécifier des frais de livraison personnalisés selon la localité du client.
- **Suivi des Commissions & Paiements** :
  - Tableau de bord personnel avec suivi de ses revenus nets.
  - Historique de toutes ses ventes conclues.

---

## 3. Exemple Concret de Workflow

### 📌 Scénario : Vente d'un kit vidéo surveillance via une campagne TikTok
1. **Étape 1 : Promotion du produit**
   - Sara, e-commerçante, fait la promotion du *Kit Caméras Solaires WiFi* (Prix de vente : `120 000 KMF`, Commission E-commerçant : `18 000 KMF`).
2. **Étape 2 : Commande reçue**
   - Un client d'Anjouan valide sa commande.
   - Sara se connecte sur la plateforme AYLAN GROUP et enregistre la vente :
     - Client : *Docteur Said - Mutsamudu (Anjouan)*
     - Produit : *Kit Caméras Solaires WiFi* (Quantité : `1`)
     - Type de livraison : `DELIVERY`, Frais : `4 000 KMF`
3. **Étape 3 : Décompte financier**
   - Chiffre d'affaires : $\mathbf{120\,000\text{ KMF}}$
   - Commission Sara : $\mathbf{18\,000\text{ KMF}}$
   - Commission Leader : $\mathbf{0\text{ KMF}}$
   - Part Stockiste Net : $120\,000 - 18\,000 = \mathbf{102\,000\text{ KMF}}$
4. **Étape 4 : Paiement par la comptabilité**
   - À la livraison du colis, le statut passe à `DELIVERED`.
   - Le comptable valide le règlement des `18 000 KMF` à Sara.
