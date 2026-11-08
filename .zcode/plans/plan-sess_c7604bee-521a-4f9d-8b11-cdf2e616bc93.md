# Pont Agricole — Passa Design "Pro" Kaml (Site Kaml, Identité Vert 7afidha 3liha)

## Context
Bghiti site ybano mzyan pro. Mn l'analyse li dert:
- **Vitrine** (Home, Catalogue, Catégories, ProductCard, Navbar, Footer) deja mzyana, walakin **HomePage r9i9a** (ghir hero + grid — ma 3ndha ta sections dial confiance/USP li kaykheljo site ybano pro).
- **CSS** (5,068 lignes f file wa7ed): variables n9iyyin (`--primary-200/300`, `--amber-200/800`, `--shadow-xl` m3arfin ach mn ba3d), 727 `!important`, radii mkhtalfin (3px → 28px hardcoded), gris mkhaltin (neutres verts vs slate Tailwind), **3 dyal systèmes dial modals**, 3 dyal shapes dial boutons, fonts chargés 2 marat, ~400+ lignes CSS mort (ancien product-card system + ancien bottom nav).
- **Code inline kther**: AdminDashboard (367 blocs style), InvoiceModal (68), AuthPage (60), CartDrawer (44) — couleurs hardcoded katkhrej 3la tokens.
- **Bugs visibles**: titre **b l'anglais** f AuthPage ("Access your kitchen's best fresh produce") f site 3ndo kolchi français, lien "Contact" kat-scroller l anchor m3awd (`#contact-info` ma kaynch), boutons hardcoded b #166534/#b91c1c etc.

**Approach**: n7afdo 3la l'identité vert maraîcher + amber (Outfit + Plus Jakarta Sans), w n-refinewha l niveau premium: cohérence, espacement, hiérarchie, micro-interactions. Ma ghadi n3awd nkteb l-CSS mn zero — correction f place + tokens + classes partagés.

## Khidma (b l'ordre)

### 1. Fondations Design System — `src/styles/index.css`
- Zid l-tokens n9iyyin: `--primary-200/300`, `--amber-200/800`, `--shadow-xl`, `--danger-*` (l rouge), radii tokens jdod (16/20/24px), typographic scale (rem-based).
- 7iyed l-fonts li chargin f `@import` (line 1) — yb9a ghir `<link>` f `index.html`.
- 7iyed CSS mort: bloc `.product-card`/`.catalog-grid` l9dim (lines ~663-915 + overrides mobile ~1792-1980), `.mobile-bottom-bar` l9dim (lines ~1573-1665), `.cat-card-overlay`, `.modern-card-topbar`, `body padding` conflict (safe-area vs 85px).
- Unify: **modal wa7ed** (`.modal-overlay/.modal-content` — n-rename f AdminPasswordModal), boutons (`.btn` family ykoun l-language l-asasi; hero/auth CTAs yakhdo nafs l-weight/radius language), gris slate → green-tinted tokens f les sections li ghadi nmso.

### 2. HomePage + Vitrine — sections li kaykheljo site "pro"
- **HomePage** (`src/pages/HomePage.tsx`): zid **trust/USP bar** (4 piliers: Fraîcheur sélectionnée chaque nuit · Livraison dès l'aube · Prix de gros du carreau · Service CHR dédié), **raccourci catégories** (strip dial 4 categories), w **bande CTA** 9bel footer (bande verte foncée "Prêt à approvisionner vos cuisines ?").
- **Hero**: refinement typographique (clamp sizes, letter-spacing), stats mini-row f l-banner, hover polish 3la CTA.
- **ProductCard**: hover lift + shadow cohérent, focus-visible ring, image fade-in.
- **CatalogPage / CategoriesPage**: polish l-filter card, pills, empty states (icon + action), headings unifiés.
- **Navbar**: dropdown inline styles → classes; 7seb l-link "Contact" (ywjih l-footer/contact section).
- **Footer**: couleurs → tokens.

### 3. AuthPage — `src/pages/AuthPage.tsx`
- Titre anglais → **français** (ex: "L'accès direct aux meilleurs produits frais pour vos cuisines").
- Slate grays (#0f172a, #64748b...) → tokens verts; panel visual inline → classes; accent `#166534` → `var(--primary-800)`.
- Polish: focus states, error banners unifiés m3a `.form-input` language.

### 4. Cart + Modals Client
- **CartDrawer** (44 blocs inline → classes `cart-*`): rows, stepper, totals, formulaire — kolchi b tokens; zid micro-interaction (item remove animation).
- **OrderSuccessModal / InvoiceModal**: chrome (header bar, boutons) → classes; l-papier A4 dial facture yb9a b Arial (délibéré l print) walakin boutons/badges → tokens.

### 5. ClientDashboardPage
- Inline banners/empty states → classes; bouton "Facture / BL" hardcoded (#f0fdf4/#bbf7d0/#166534) → `.btn-outline.btn-sm`; polish order cards (status badges déjà mzyanin).

### 6. AdminDashboardPage (l-partie l-kbira — 3,756 lignes)
- Ma ghadi n3awd nktebo: n-target **cohérence visuelle**:
  - KPI cards (overview inline grids) → class `.admin-stat-card` partagé (b7al `.admin-quick-stat-card` l-mzyan deja).
  - Section headers inline → `.admin-section-header`.
  - Password modal `.modal-backdrop/.modal-container` → `.modal-overlay/.modal-content`.
  - Boutons actions (danger/approve) → `.btn-*.btn-sm` m3a tokens `--danger-*`.
  - Tables `.data-table` uniformisation (padding, hover, badges statut → `.badge-status-*` m3a l-client).
- De-inline l-visible b l-modhar, ma machi 7tta wa7da mn 367 blocs (l'objectif: consistency, machi refactor kaml).

### 7. Cleanup + Build
- 7iyed files mort (verify ma importinch): `src/index.css`, `src/App.css`, `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`.

## Files mohimmin
- `src/styles/index.css` (l'aghlab l-khidma)
- `src/pages/HomePage.tsx`, `src/pages/AuthPage.tsx`, `src/pages/ClientDashboardPage.tsx`, `src/pages/AdminDashboardPage.tsx`
- `src/components/Hero.tsx`, `Navbar.tsx`, `ProductCard.tsx`, `Footer.tsx`, `CartDrawer.tsx`, `OrderSuccessModal.tsx`, `InvoiceModal.tsx`

## Verification
1. `npm run build` (tsc + vite) — lach errors.
2. `npm run dev` + screenshots (browser skill) l: Home, Catalogue, Catégories, Auth, Client Dashboard, Panier f **desktop + mobile** widths.
3. Test l-pages b login-wall: ila l-creds dyal test ma 3ndich, n-verifyi AuthPage visuellement w n-verifyi l-pages l-khrin b code review + build (w ngoulik t3ayet liya ila bghiti screenshots b compte dyalek).
4. Commit wara kol phase kbira (style:/feat: prefixes b7al git history dyalek).