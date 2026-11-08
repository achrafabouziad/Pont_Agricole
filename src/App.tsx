import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { CategoriesPage } from './pages/CategoriesPage';
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
      const u = store.getCurrentUser();
      setCurrentUser(u);
      if (!u && (currentPage === 'client-dashboard' || currentPage === 'admin')) {
        handleNavigate('auth');
      }
    });
    return unsub;
  }, [currentPage]);

  // Heartbeat de présence & validation de session en direct (expulsion immédiate dès suppression par l'admin)
  useEffect(() => {
    if (!currentUser) {
      // Pour les visiteurs : rafraîchir périodiquement le catalogue de produits
      const visitorInterval = setInterval(() => {
        store.getProducts();
      }, 15000);

      const handleVisitorFocus = () => {
        store.getProducts();
      };

      window.addEventListener('focus', handleVisitorFocus);
      document.addEventListener('visibilitychange', handleVisitorFocus);

      return () => {
        clearInterval(visitorInterval);
        window.removeEventListener('focus', handleVisitorFocus);
        document.removeEventListener('visibilitychange', handleVisitorFocus);
      };
    }

    if (currentUser.role === 'customer') {
      store.validateSession();
    } else {
      store.updateLastSeen();
    }

    // Validation rapide toutes les 3 secondes pour les clients (multi-appareils / mobile)
    const interval = setInterval(() => {
      if (currentUser.role === 'customer') {
        store.validateSession();
      } else {
        store.updateLastSeen();
      }
      store.getProducts();
    }, currentUser.role === 'customer' ? 3000 : 30000);

    const handleFocus = () => {
      if (currentUser.role === 'customer') {
        store.validateSession();
      } else {
        store.updateLastSeen();
      }
      store.getProducts();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (currentUser.role === 'customer') {
          store.validateSession();
        } else {
          store.updateLastSeen();
        }
        store.getProducts();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser]);

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

      if (['home', 'catalog', 'categories', 'favorites', 'auth', 'client-dashboard'].includes(targetPage)) {
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
    if (currentUser?.role === 'customer') {
      store.validateSession();
    }
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
  // Dès l'ouverture du lien, affiche la page de Connexion (Se connecter) ou Inscription (Sign up)
  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f6f7f6', display: 'flex', flexDirection: 'column' }}>
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AuthPage
            initialMode="login"
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
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'categories' && (
          <CategoriesPage
            onSelectCategory={handleSelectCategory}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'favorites' && (
          <CatalogPage
            showOnlyFavorites={true}
            onOpenCart={() => setIsCartOpen(true)}
            onNavigate={handleNavigate}
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

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Pont Agricole Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backgroundColor: '#f6f7f6', textAlign: 'center' }}>
          <div style={{ maxWidth: '480px', backgroundColor: '#ffffff', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <img src="/logo.png" alt="Pont Agricole" style={{ width: '48px', height: '48px', objectFit: 'contain', margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#166534', marginBottom: '0.5rem' }}>Pont Agricole</h2>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.5rem' }}>
              Une actualisation est nécessaire pour afficher la dernière version de l'application.
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              style={{
                backgroundColor: '#166534',
                color: '#ffffff',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Recharger la Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
