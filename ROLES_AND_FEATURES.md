# Guide des Rôles & Fonctionnalités — AYLAN GROUP

Ce document décrit en détail les accès, droits et fonctionnalités disponibles pour chaque rôle utilisateur au sein de la plateforme web AYLAN GROUP.

---

## Table des Rôles

1. [Administrateur (ADMIN)](#1-administrateur-admin)
2. [Comptable (ACCOUNTANT)](#2-comptable-accountant)
3. [Leader (LEADER)](#3-leader-leader)
4. [Agent Commercial / Téléconseiller (AGENT)](#4-agent-commercial--téléconseiller-agent)
5. [Assistant Livraisons (DELIVERY_ASSISTANT)](#5-assistant-livraisons-delivery_assistant)

---

## 1. Administrateur (ADMIN)
L'administrateur possède un contrôle total sur la configuration de la plateforme, les produits et les utilisateurs.

*   **Gestion des Utilisateurs** :
    *   Créer, modifier et désactiver des comptes (Administrateurs, Comptables, Leaders, Agents, Assistant Livraisons).
    *   Assigner des agents commerciaux à un **Leader** spécifique pour structurer les équipes.
*   **Gestion des Produits** :
    *   Ajouter de nouveaux produits au catalogue global.
    *   Définir si un produit est **Commun** (accessible à tous les leaders et leurs agents) ou **Spécifique** (affecté à un leader unique).
    *   Configurer les prix d'achat, de vente, les commissions des agents et les seuils d'alerte de stock.
*   **Tableau de Bord Consolidé** :
    *   Visualiser le chiffre d'affaires global et le volume de ventes de l'entreprise.
    *   Consulter le tableau de performance de tous les agents de la plateforme (CA, ventes, prospects, taux de conversion).
*   **Suivi Comptable** :
    *   Accéder à la vue de répartition des gains entre leaders.
    *   Exporter toutes les transactions comptabilisées au format Excel/CSV.

---

## 2. Comptable (ACCOUNTANT)
Le comptable supervise les flux financiers, valide les commissions et gère les mouvements de stock physiques.

*   **Comptabilité & Répartition des Gains** :
    *   Visualiser la répartition des gains entre les différents leaders de la plateforme.
    *   Calcul automatisé : les gains des produits communs sont divisés à parts égales entre les leaders, tandis que les gains des produits spécifiques sont attribués à 100 % au leader associé.
    *   Exporter l'ensemble du registre de ventes validées.
*   **Gestion des Commissions** :
    *   Consulter l'état des commissions générées par les agents commercials.
    *   Valider et marquer les commissions comme payées (**Réglées**).
*   **Contrôle des Stocks** :
    *   Enregistrer des mouvements de stock manuels (Entrées, Pertes, Dommages, Retours de marchandises).
    *   Consulter la valeur totale du stock (prix d'achat vs prix de vente).

---

## 3. Leader (LEADER)
Le leader gère sa propre équipe de commerciaux, ses produits dédiés, et suit ses gains financiers.

*   **Gestion d'Équipe Exclusive** :
    *   Créer et gérer des comptes de téléconseillers (rôle `AGENT`) rattachés directement à lui-même.
    *   Suivre les performances (KPIs, ventes, prospects, taux de conversion) de ses propres commerciaux uniquement.
*   **Gestion de Produits Spécifiques** :
    *   Ajouter des produits spécifiques exclusifs à sa propre équipe (non visibles par les autres leaders et leurs agents).
*   **Suivi CRM & Ventes** :
    *   Consulter les prospects (CRM) de ses agents et soumettre des ventes pour leur compte.
*   **Suivi de ses Gains** :
    *   Accéder à son espace comptabilité affichant ses gains nets cumulés (sa part égale des produits communs + 100% du bénéfice de ses produits spécifiques).
    *   Consulter les commissions générées par ses téléconseillers.

---

## 4. Agent Commercial / Téléconseiller (AGENT)
L'agent est centré sur la prospection et la conclusion des ventes avec les clients finaux.

*   **Gestion de son CRM** :
    *   Créer, qualifier et mettre à jour ses fiches prospects (Coordonnées, Source, Statut du tunnel de conversion).
*   **Prise de Commande & Enregistrement de Vente** :
    *   Enregistrer de nouvelles ventes pour ses clients.
    *   Sélectionner les produits éligibles (Produits Communs + Produits Spécifiques de son Leader associé).
    *   Configurer le mode de livraison (Retrait ou Livraison à domicile) et la ville.
*   **Tableau de Bord Personnel** :
    *   Visualiser ses propres statistiques (son Chiffre d'Affaires personnel, ses transactions conclues, ses commissions acquises).

---

## 5. Assistant Livraisons (DELIVERY_ASSISTANT)
L'assistant de direction s'occupe de la logistique de livraison des commandes validées.

*   **Supervision des Expéditions** :
    *   Consulter la liste de toutes les ventes de la plateforme.
    *   Filtrer les commandes nécessitant une expédition par ville ou type de livraison.
*   **Mise à jour des Statuts de Vente** :
    *   Mettre à jour le statut des commandes : *Confirmée*, *Expédiée*, puis *Livrée* ou *Annulée*.
    *   La mise à jour au statut *Livrée* déclenche la comptabilisation définitive de la vente pour le calcul des gains du leader et de la commission de l'agent.
