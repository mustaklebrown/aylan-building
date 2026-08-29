# 📊 Rôle 6 : Comptable (`ACCOUNTANT`)

## 1. Description Générale
Le **Comptable** supervise la santé financière de la plateforme, contrôle la rentabilité globale, valide la répartition des gains entre les Leaders et Stockistes, règle les commissions des commerciaux et audite les valorisations de stock.

---

## 2. Accès & Permissions Principales

- **Espace Comptabilité & Répartition des Bénéfices** :
  - Accès à la matrice de répartition des gains :
    - **Produits Communs** : Les bénéfices nets ($\text{Vente} - \text{Achat} - \text{Commissions}$) sont divisés à parts égales entre les Leaders actifs.
    - **Produits Spécifiques** : Les bénéfices nets sont attribués à 100 % au Leader rattaché au produit.
  - Export de l'ensemble des écritures de ventes au format CSV / Excel pour intégration comptable externe.
- **Gestion & Règlement des Commissions** :
  - Consultation de toutes les commissions générées (`PENDING`).
  - Validation et marquage comme **Payée (`PAID`)** en un clic.
  - Traçabilité automatique par `AuditLog` de chaque transaction réglée.
- **Contrôle & Valorisation des Stocks** :
  - Visualisation de la valeur du stock au **Prix d'Achat** (actif circulant) et au **Prix de Vente** (chiffre d'affaires potentiel).
  - Enregistrement des ajustements d'inventaire et des mouvements de régularisation.

---

## 3. Exemple Concret de Workflow

### 📌 Scénario : Clôture mensuelle des commissions et répartition
1. **Étape 1 : Vérification des ventes livrées**
   - Le comptable consulte l'onglet **Commissions** (`/commissions`).
   - Il filtre les commissions au statut `PENDING` associées aux ventes au statut `DELIVERED`.
2. **Étape 2 : Validation des règlements**
   - L'agent Paul a cumulé `45 000 KMF` de commissions validées.
   - Le comptable procède au virement / paiement physique et clique sur **« Marquer comme payée »**.
   - Le système passe le statut à `PAID` et enregistre une trace d'audit indélébile.
3. **Étape 3 : Calcul de la part des Leaders**
   - Le comptable consulte l'onglet **Comptabilité** (`/accounting`).
   - Les bénéfices des produits communs du mois (`1 200 000 KMF`) sont automatiquement divisés entre les 3 Leaders (`400 000 KMF` chacun).
   - Le comptable exporte le rapport global en CSV.
