# Pont Agricole 🇲🇦

> **« Le lien entre la terre et l'avenir »**  
> Plateforme B2B de Fourniture de Fruits, Légumes et Herbes Fraîches pour Cafés, Restaurants, Hôtels (CHR/HORECA) et Traiteurs au Maroc.

---

## 🌟 Présentation du Projet

**Pont Agricole** est une solution web professionnelle conçue pour moderniser et fiabiliser la chaîne d'approvisionnement des professionnels des métiers de bouche au Maroc.

### Fonctionnalités Clés :
* 🛒 **Catalogue Maraîcher Complet** : Tomates, pommes de terre, oignons, bananes, agrumes, herbes aromatiques (menthe, coriandre, persil) avec prix de gros en Dirhams Marocains (MAD).
* 📦 **Unités de Vente B2B Dédiées** : Caisses, cartons, bottes fraîches, plateaux ou vente au kilogramme avec seuils minimaux de commande.
* 🚚 **Logistique Matinale CHR** : Gestion des zones de livraison (Casablanca, Rabat-Salé, Marrakech, Tanger, Fès-Meknès, Agadir) avec clôture quotidienne à 21h00 et livraison dès 07h00.
* 🔐 **Comptes Professionnels & Approbation B2B** : Vérification manuelle par l'administrateur des nouveaux établissements inscrits avant validation des commandes fermes.
* 📊 **Tableau de Bord Administrateur Sécurisé** : KPI en temps réel, gestion des statuts de commande, validation des comptes CHR, mise à jour des prix et gestion des zones de livraison.
* 🔄 **Recommandation en 1 Clic** : Réapprovisionnement rapide pour les brigades de cuisine à partir de l'historique des commandes.

---

## 🛠️ Stack Technique

* **Frontend** : React 18, TypeScript, Vite
* **Design System** : CSS Moderne personnalisé avec variables sémantiques, typographie *Plus Jakarta Sans* & *Outfit*, glassmorphism et charte Pont Agricole (Vert forêt `#0b3821`, Vert feuillage `#1d6e42`, Ambre solaire `#f59e0b`).
* **Icônes** : Lucide React
* **Backend & Base de Données** : Supabase (PostgreSQL, Row Level Security, Auth)
* **Mode Hybride Démo** : Prise en charge native immédiate avec persistance locale (`localStorage`) et bascule instantanée sur Supabase dès l'ajout des clés d'environnement.

---

## 🚀 Installation & Lancement Local

### 1. Prérequis
* Node.js (version 18+ recommandée)
* npm

### 2. Installation des dépendances
```bash
npm install
```

### 3. Lancer le serveur de développement
```bash
npm run dev
```
L'application sera accessible sur [http://localhost:5173](http://localhost:5173).

### 4. Compiler pour la production
```bash
npm run build
```
Les fichiers prêts pour le déploiement seront générés dans le dossier `dist/`.

---

## 🗄️ Configuration de Supabase & Base de Données

### 1. Créer un projet Supabase
1. Rendez-vous sur [supabase.com](https://supabase.com) et créez un nouveau projet (choisir la région la plus proche, par ex. *Frankfurt* ou *London*).
2. Rendez-vous dans **Project Settings > API** pour récupérer votre **Project URL** et votre **anon / public key**.

### 2. Appliquer les migrations SQL
1. Dans votre tableau de bord Supabase, ouvrez l'onglet **SQL Editor**.
2. Copiez le contenu du fichier [supabase/migrations/001_initial_schema.sql](file:///Users/macbook/Desktop/Pont%20Agricole/supabase/migrations/001_initial_schema.sql) et exécutez-le.  
   *(Ce script crée les tables `profiles`, `businesses`, `categories`, `products`, `orders`, `order_items`, `delivery_zones`, `company_settings`, ainsi que les politiques Row Level Security (RLS) et le trigger d'inscription automatique).*
3. Pour insérer les produits maraîchers marocains et les zones de livraison, copiez et exécutez le script [supabase/seed.sql](file:///Users/macbook/Desktop/Pont%20Agricole/supabase/seed.sql).

### 3. Configurer les variables d'environnement
Créez un fichier `.env` à la racine du projet :
```bash
cp .env.example .env
```
Renseignez vos identifiants réels :
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon_publique
```

---

## 🛡️ Sécurité & Création du Premier Administrateur

Par mesure de sécurité stricte, aucun utilisateur ne peut s'auto-attribuer le rôle `admin` depuis l'interface web.

### Pour promouvoir un utilisateur au statut Administrateur :
1. Créez un compte normalement depuis la page d'inscription du site (ou dans l'onglet **Authentication > Users** de Supabase).
2. Ouvrez l'éditeur SQL de Supabase et exécutez la requête suivante avec l'email concerné :
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'direction@pontagricole.ma'
);
```
3. Cet utilisateur aura désormais un accès exclusif au **Tableau de Bord Administrateur** (`/admin`).

---

## 🌐 Déploiement en Ligne (Vercel / Netlify)

### Déploiement sur Vercel :
1. Poussez votre code sur votre dépôt GitHub.
2. Importez le projet sur [vercel.com](https://vercel.com).
3. Dans la section **Environment Variables**, ajoutez :
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
4. Cliquez sur **Deploy**.

---

## 📞 Support & Contact Commercial
* **Société** : Pont Agricole SARL-AU
* **Adresse** : Halle aux Primeurs, Marché de Gros, Casablanca, Maroc
* **Téléphone** : +212 5 22 45 78 90
* **WhatsApp Pro** : +212 6 61 98 76 54
* **Email** : contact@pontagricole.ma
