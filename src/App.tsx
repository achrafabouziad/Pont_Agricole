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
import { Order, UserProfile } from './types';
import { Lock, ShieldCheck } from 'lucide-react';

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
    // Synchroniser la route depuis l'URL en protégeant strictement l'accès admin
    const syncRouteFromUrl = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page') || (params.has('admin') ? 'admin' : null);

      const targetPage = pageParam || hash;
      const user = store.getCurrentUser();

      // Si le lien contient #admin ou ?admin
      if (targetPage === 'admin') {
        if (user?.role === 'admin') {
          // L'administrateur autorise l'accès admin
          setCurrentPage('admin');
        } else {
          // Si ce n'est pas l'admin ou si le lien a été copié avec #admin :
          // Nettoyer immédiatement l'URL et rediriger vers la vitrine d'accueil
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname);
          }
          setCurrentPage('home');
        }
        return;
      }

      if (['home', 'catalog', 'auth', 'client-dashboard'].includes(targetPage)) {
        setCurrentPage(targetPage);
      } else {
        // En ouvrant le lien du site par défaut : TOUJOURS la page d'accueil
        setCurrentPage('home');
      }
    };

    syncRouteFromUrl();
    window.addEventListener('hashchange', syncRouteFromUrl);
    return () => window.removeEventListener('hashchange', syncRouteFromUrl);
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    // Nettoyer l'URL pour ne pas polluer l'adresse avec #admin ou #home
    // Cela garantit que lorsque l'administrateur copie le lien pour un client,
    // le lien est propre (ex: https://pontagricole.ma/) et n'atterrit jamais sur l'admin
    if (page === 'home' || page === 'admin') {
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } else {
      window.location.hash = page;
    }
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
      <div style={{ minHeight: '100vh', backgroundColor: '#f6f7f6', display: 'flex', flexDirection: 'column' }}>
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          currentUser?.role === 'admin' ? (
            <AdminDashboardPage onNavigate={handleNavigate} />
          ) : (
            <HomePage
              onNavigate={handleNavigate}
              onSelectCategory={handleSelectCategory}
              onOpenCart={() => setIsCartOpen(true)}
            />
          )
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
