# 🚚 Rôle 8 : Livreur Terrain (`DELIVERY`)

## 1. Description Générale
Le **Livreur** assure l'acheminement physique des colis du magasin jusqu'au client final. Il dispose d'une interface web mobile optimisée pour son smartphone, lui permettant d'activer sa disponibilité, d'être notifié en temps réel des courses disponibles, d'accepter des livraisons, de contacter les clients en 1 clic et d'encaisser les commandes.

---

## 2. Accès & Permissions Principales

- **Gestion de sa Disponibilité en Temps Réel** :
  - Interrupteur rapide **« Disponible / En Service »** $\leftrightarrow$ **« Hors Service »**.
  - Lorsque disponible, le livreur reçoit les alertes sonores et vibrations lors de l'arrivée d'une nouvelle commande dans sa zone.
- **Prise en Charge des Courses (Claim)** :
  - Visualisation des courses disponibles avec adresse, ville, montant des frais de livraison et montant total à encaisser.
  - Bouton **« Accepter la course »** : Verrouille la livraison pour lui seul et passe son état en cours de livraison (`SHIPPED`).
  - Bouton **« Refuser »** : Remet la course à disposition des autres livreurs.
- **Outils Terrain Mobiles** :
  - **Appel rapide** : Ouvre l'application téléphone avec le numéro du client.
  - **WhatsApp rapide** : Ouvre une conversation WhatsApp pré-rédigée pour prévenir le client de son arrivée imminente.
  - **Bordereau mobile** : Affiche le récapitulatif du colis et le montant exact en espèces (KMF) à récupérer.
- **Validation de Livraison** :
  - Bouton **« Marquer comme Livrée »** à la remise du colis et encaissement.
  - Libère automatiquement le livreur pour sa prochaine course.

---

## 3. Exemple Concret de Workflow Mobile

### 📌 Scénario : Course en direct sur smartphone
1. **Étape 1 : Début de journée**
   - Le livreur Youssouf ouvre son smartphone sur la page `/deliveries`.
   - Il bascule son statut sur **« DISPONIBLE »** (badge vert allumé).
2. **Étape 2 : Réception d'une nouvelle livraison**
   - Une alerte visuelle et une vibration mobile apparaissent :
     - *Client : Mme Fatouma - Moroni Coulée*
     - *Colis : Téléviseur Solaire 32" + Panneau*
     - *Montant à encaisser : 85 000 KMF (Produit) + 2 000 KMF (Frais de port)*
3. **Étape 3 : Prise en charge**
   - Youssouf clique sur **« Accepter la livraison »**.
   - Son statut passe en **Occupé** (`isAvailable = false`).
   - La commande passe en statut **En route (`SHIPPED`)**.
4. **Étape 4 : Contact client et trajet**
   - Youssouf clique sur l'icône WhatsApp pour envoyer : *« Bonjour Mme Fatouma, votre livreur AYLAN GROUP est en route et arrive dans 15 minutes. »*
5. **Étape 5 : Clôture de la livraison**
   - Youssouf remet le colis et encaisse les `87 000 KMF`.
   - Il clique sur **« Marquer livrée »**.
   - La commande passe en **`DELIVERED`**, Youssouf redevient immédiatement disponible pour la course suivante.
