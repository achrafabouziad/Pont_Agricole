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
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('all');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  useEffect(() => {
    // Read route from URL hash or query params (?admin or #admin)
    const syncRouteFromUrl = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page') || (params.has('admin') ? 'admin' : null);

      const targetPage = pageParam || hash;
      if (targetPage === 'admin') {
        store.setAdminMode();
        setCurrentPage('admin');
      } else if (['home', 'catalog', 'auth', 'client-dashboard'].includes(targetPage)) {
        setCurrentPage(targetPage);
      }
    };

    syncRouteFromUrl();
    window.addEventListener('hashchange', syncRouteFromUrl);
    return () => window.removeEventListener('hashchange', syncRouteFromUrl);
  }, []);

  const handleNavigate = (page: string) => {
    if (page === 'admin') {
      store.setAdminMode();
    }
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
            onSuccess={() => handleNavigate('client-dashboard')}
          />
        )}

        {currentPage === 'client-dashboard' && (
          <ClientDashboardPage
            onNavigate={handleNavigate}
            onOpenCart={() => setIsCartOpen(true)}
          />
        )}

        {currentPage === 'admin' && (
          <AdminDashboardPage />
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
