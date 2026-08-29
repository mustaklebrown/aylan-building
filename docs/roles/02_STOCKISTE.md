# 📦 Rôle 2 : Stockiste (`STOCKISTE`)

## 1. Description Générale
Le **Stockiste** est le propriétaire ou le gestionnaire physique de marchandises stockées. Il approvisionne la plateforme en produits, définit ses conditions tarifaires (prix de vente, commissions accordées aux commerciaux, aux leaders et aux e-commerçants) et perçoit le produit net de la vente après déduction des commissions commerciales.

---

## 2. Accès & Permissions Principales

- **Gestion de son Catalogue de Produits** :
  - Ajouter de nouveaux produits rattachés à son compte.
  - Définir les prix : Prix d'achat, Prix de vente conseillé.
  - Fixer les **3 paliers de commission** par unité :
    - Commission Téléconseiller (`agentCommission`)
    - Commission Leader (`leaderCommission`)
    - Commission E-commerçant (`ecommercantCommission`)
  - Activer ou désactiver un produit en un clic (un produit désactivé ne peut plus être commandé).
- **Gestion des Mouvements de Stock Physiques** :
  - Enregistrer un réapprovisionnement (`IN` : Entrée de stock).
  - Enregistrer des sorties de stock non liées à la vente (`OUT_LOSS` : Perte, `OUT_DAMAGE` : Marchandise détériorée).
  - Effectuer des corrections manuelles de stock suite à un inventaire physique (`CORRECTION`).
- **Suivi des Ventes & Revenus Nets** :
  - Visualiser toutes les commandes passées sur ses produits.
  - Suivre son revenu net cumulé en temps réel :
    $$\text{Revenu Net} = \text{Chiffre d'Affaires Brut} - \text{Commissions Vendeurs} - \text{Commissions Leaders}$$

---

## 3. Exemple Concret de Workflow

### 📌 Scénario : Lancement d'un nouveau produit et suivi de rentabilité
1. **Étape 1 : Création du produit**
   - Nom : *Onduleur Hybride 5kVA*
   - SKU : `OND-5KVA-01`
   - Prix d'achat : `200 000 KMF`
   - Prix de vente : `350 000 KMF`
   - Stock initial : `15 unités` (Seuil d'alerte : `3`)
   - Commission Téléconseiller : `20 000 KMF`
   - Commission Leader : `10 000 KMF`
   - Commission E-commerçant : `35 000 KMF`
2. **Étape 2 : Réception d'une vente conclue par un Téléconseiller (2 unités)**
   - Montant brut perçu du client : $350\,000 \times 2 = \mathbf{700\,000\text{ KMF}}$
   - Commission Téléconseiller déduite : $20\,000 \times 2 = \mathbf{40\,000\text{ KMF}}$
   - Commission Leader déduite : $10\,000 \times 2 = \mathbf{20\,000\text{ KMF}}$
   - **Crédit net revenant au Stockiste** : $700\,000 - 40\,000 - 20\,000 = \mathbf{640\,000\text{ KMF}}$
   - Stock restant : $15 - 2 = \mathbf{13\text{ unités}}$.
3. **Étape 3 : Arrivée d'un nouveau conteneur (+10 unités)**
   - Le stockiste enregistre un mouvement de stock de type **IN** de 10 unités.
   - Le stock passe instantanément à $13 + 10 = \mathbf{23\text{ unités}}$.
