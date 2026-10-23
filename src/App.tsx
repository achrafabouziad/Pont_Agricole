import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { AuthPage } from './pages/AuthPage';
import { ClientDashboardPage } from './pages/ClientDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { store } from './services/store';
import { Order } from './types';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(store.getCurrentUser());
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('all');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setCurrentUser(store.getCurrentUser());
    });
    return unsub;
  }, []);

  useEffect(() => {
    // Read route from URL hash or query params (?admin or #admin)
    const syncRouteFromUrl = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page') || (params.has('admin') ? 'admin' : null);

      const targetPage = pageParam || hash;
      if (['home', 'catalog', 'auth', 'client-dashboard', 'admin'].includes(targetPage)) {
        setCurrentPage(targetPage);
      }
    };

    syncRouteFromUrl();
    window.addEventListener('hashchange', syncRouteFromUrl);
    return () => window.removeEventListener('hashchange', syncRouteFromUrl);
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCatalogCategory(categoryId);
  };

  const handleOrderSuccess = (order: Order) => {
    setLastPlacedOrder(order);
  };

  // VERROUILLAGE B2B STRICT : Le visiteur ne peut pas voir l'accueil sans être inscrit / connecté
  if (!currentUser) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
        {/* En-tête exclusif B2B responsive */}
        <header className="site-header" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem' }}>
            <div className="brand-logo" style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <img src="/logo.png" alt="Pont Agricole Logo" className="brand-img" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
              <div className="brand-text">
                <div className="brand-title" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-900)', lineHeight: 1.1 }}>
                  Pont Agricole
                </div>
                <div className="brand-subtitle" style={{ fontSize: '0.62rem', letterSpacing: '0.06em', color: 'var(--primary-700)' }}>
                  PRODUITS FRAIS CHR MAROC
                </div>
              </div>
            </div>
            <div className="badge badge-brand" style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.65rem', whiteSpace: 'nowrap' }}>
              🔒 Accès B2B Pro
            </div>
          </div>
        </header>

        {/* Message d'accueil / Verrouillage B2B compact */}
        <div style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0', padding: '0.65rem 1rem', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#166534', fontWeight: 600, lineHeight: 1.4 }}>
            🌱 <strong>Espace Réservé CHR :</strong> Créez votre compte pro ou connectez-vous pour consulter le catalogue, les cours du jour en MAD et passer commande.
          </p>
        </div>

        {/* Formulaire d'inscription / connexion obligatoire */}
        <main style={{ flex: 1 }}>
          <AuthPage
            initialMode="register"
            onSuccess={() => {
              const u = store.getCurrentUser();
              if (u?.role === 'admin') {
                handleNavigate('admin');
              } else {
                handleNavigate('home');
              }
            }}
          />
        </main>

        <Footer onNavigate={() => {}} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      {/* Navigation Header */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Main Content Router */}
      <main style={{ flex: 1 }}>
        {currentPage === 'home' && (
          <HomePage
            onNavigate={handleNavigate}
            onSelectCategory={handleSelectCategory}
            onOpenCart={() => setIsCartOpen(true)}
          />
        )}

        {currentPage === 'catalog' && (
          <CatalogPage
            initialCategoryId={selectedCatalogCategory}
            onOpenCart={() => setIsCartOpen(true)}
          />
        )}

        {currentPage === 'auth' && (
          <AuthPage
            onSuccess={() => {
              const u = store.getCurrentUser();
              if (u?.role === 'admin') {
                handleNavigate('admin');
              } else {
                handleNavigate('client-dashboard');
              }
            }}
          />
        )}

        {currentPage === 'client-dashboard' && (
          <ClientDashboardPage
            onNavigate={handleNavigate}
            onOpenCart={() => setIsCartOpen(true)}
          />
        )}

        {currentPage === 'admin' && (
          <AdminDashboardPage onNavigate={handleNavigate} />
        )}
      </main>

      {/* Slide-out Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onNavigateToAuth={() => handleNavigate('auth')}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Order Success Modal */}
      <OrderSuccessModal
        order={lastPlacedOrder}
        onClose={() => setLastPlacedOrder(null)}
        onGoToDashboard={() => {
          setLastPlacedOrder(null);
          handleNavigate('client-dashboard');
        }}
      />

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Native App-Style Mobile Bottom Navigation */}
      <MobileBottomNav
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenCart={() => setIsCartOpen(true)}
      />
    </div>
  );
}

export default App;
