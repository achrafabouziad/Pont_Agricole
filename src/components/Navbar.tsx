import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, ShieldCheck, Menu, X, LogOut, ChevronDown, CheckCircle, Clock } from 'lucide-react';
import { store } from '../services/store';
import { UserProfile, Business } from '../types';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, onOpenCart }) => {
  const [user, setUser] = useState<UserProfile | null>(store.getCurrentUser());
  const [business, setBusiness] = useState<Business | null>(store.getCurrentBusiness());
  const [cartCount, setCartCount] = useState<number>(store.getCart().reduce((sum, i) => sum + i.quantity, 0));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setUser(store.getCurrentUser());
      setBusiness(store.getCurrentBusiness());
      setCartCount(store.getCart().reduce((sum, i) => sum + i.quantity, 0));
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await store.logout();
    setUserDropdownOpen(false);
    onNavigate('home');
  };

  const handleRoleSwitch = (role: 'admin' | 'approved_client' | 'pending_client' | 'visitor') => {
    store.switchRole(role);
    if (role === 'admin') onNavigate('admin');
    else if (role === 'visitor') onNavigate('home');
    else onNavigate('catalog');
  };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#ffffff', boxShadow: 'var(--shadow-sm)' }}>
      {/* Quick Demo Switcher bar for testing in browser */}
      <div className="demo-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ opacity: 0.85 }}>Mode Démo Antigravity :</span>
          <span style={{ fontWeight: 600, color: 'var(--amber-400)' }}>
            {user ? (user.role === 'admin' ? 'Administrateur' : business?.approvalStatus === 'approved' ? 'Client Approuvé' : 'Client En Attente') : 'Visiteur'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <span style={{ opacity: 0.7, marginRight: '0.2rem' }}>Tester un rôle :</span>
          <button
            className={user?.role === 'admin' ? 'active' : ''}
            onClick={() => handleRoleSwitch('admin')}
          >
            Admin
          </button>
          <button
            className={user?.role === 'customer' && business?.approvalStatus === 'approved' ? 'active' : ''}
            onClick={() => handleRoleSwitch('approved_client')}
          >
            Client Approuvé
          </button>
          <button
            className={user?.role === 'customer' && business?.approvalStatus === 'pending' ? 'active' : ''}
            onClick={() => handleRoleSwitch('pending_client')}
          >
            Client En Attente
          </button>
          <button
            className={!user ? 'active' : ''}
            onClick={() => handleRoleSwitch('visitor')}
          >
            Visiteur
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem' }}>
        {/* Logo and Brand */}
        <div
          onClick={() => onNavigate('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer' }}
        >
          <img
            src="/logo.png"
            alt="Pont Agricole Logo"
            style={{ width: '46px', height: '46px', objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-900)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Pont Agricole
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--primary-600)', fontWeight: 600, letterSpacing: '0.04em' }}>
              LE LIEN ENTRE LA TERRE ET L’AVENIR
            </div>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }} className="desktop-nav">
          <button
            onClick={() => onNavigate('home')}
            style={{
              fontWeight: currentPage === 'home' ? 700 : 500,
              color: currentPage === 'home' ? 'var(--primary-700)' : 'var(--text-main)',
              fontSize: '0.95rem',
            }}
          >
            Accueil
          </button>
          <button
            onClick={() => onNavigate('catalog')}
            style={{
              fontWeight: currentPage === 'catalog' ? 700 : 500,
              color: currentPage === 'catalog' ? 'var(--primary-700)' : 'var(--text-main)',
              fontSize: '0.95rem',
            }}
          >
            Catalogue Produits
          </button>
          <button
            onClick={() => {
              if (currentPage !== 'home') onNavigate('home');
              setTimeout(() => {
                document.getElementById('advantages')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: '0.95rem' }}
          >
            Offre CHR
          </button>
          <button
            onClick={() => {
              if (currentPage !== 'home') onNavigate('home');
              setTimeout(() => {
                document.getElementById('contact-info')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: '0.95rem' }}
          >
            Contact
          </button>

          {user?.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className="badge badge-amber"
              style={{ padding: '0.4rem 0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ShieldCheck size={14} />
              Admin Dashboard
            </button>
          )}
        </nav>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            className="btn btn-secondary btn-sm"
            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Consulter le panier"
          >
            <ShoppingCart size={18} />
            <span style={{ fontWeight: 700 }}>Panier</span>
            {cartCount > 0 && (
              <span
                style={{
                  backgroundColor: 'var(--amber-500)',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  borderRadius: '9999px',
                  padding: '0.1rem 0.45rem',
                  marginLeft: '0.2rem',
                }}
              >
                {cartCount}
              </span>
            )}
          </button>

          {/* User Account / Login */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <User size={16} />
                <span style={{ maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.fullName.split(' ')[0]}
                </span>
                <ChevronDown size={14} />
              </button>

              {userDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: '260px',
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--border-light)',
                    padding: '0.85rem',
                    zIndex: 200,
                  }}
                >
                  <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.6rem', marginBottom: '0.6rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-900)' }}>
                      {user.fullName}
                    </div>
                    {business && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {business.businessName} ({business.city})
                      </div>
                    )}
                    <div style={{ marginTop: '0.35rem' }}>
                      {user.role === 'admin' ? (
                        <span className="badge badge-amber">Administrateur</span>
                      ) : business?.approvalStatus === 'approved' ? (
                        <span className="badge badge-status-delivered" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <CheckCircle size={12} /> Compte Approuvé
                        </span>
                      ) : (
                        <span className="badge badge-status-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Clock size={12} /> En Attente de Validation
                        </span>
                      )}
                    </div>
                  </div>

                  {user.role === 'customer' && (
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('client-dashboard');
                      }}
                      style={{ width: '100%', textAlign: 'left', padding: '0.5rem', borderRadius: '4px', fontSize: '0.88rem' }}
                    >
                      Mon Espace & Commandes
                    </button>
                  )}

                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('admin');
                      }}
                      style={{ width: '100%', textAlign: 'left', padding: '0.5rem', borderRadius: '4px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary-700)' }}
                    >
                      Tableau de bord Administrateur
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.88rem',
                      color: '#b91c1c',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    <LogOut size={14} /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                onClick={() => onNavigate('auth')}
                className="btn btn-outline btn-sm"
              >
                Connexion
              </button>
              <button
                onClick={() => onNavigate('auth')}
                className="btn btn-primary btn-sm"
              >
                Créer Compte Pro
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-toggle"
            style={{ display: 'none', padding: '0.4rem' }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div style={{ backgroundColor: '#ffffff', borderTop: '1px solid var(--border-light)', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <button
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              style={{ textAlign: 'left', fontSize: '1rem', fontWeight: currentPage === 'home' ? 700 : 500 }}
            >
              Accueil
            </button>
            <button
              onClick={() => {
                onNavigate('catalog');
                setMobileMenuOpen(false);
              }}
              style={{ textAlign: 'left', fontSize: '1rem', fontWeight: currentPage === 'catalog' ? 700 : 500 }}
            >
              Catalogue Produits
            </button>
            {user?.role === 'customer' && (
              <button
                onClick={() => {
                  onNavigate('client-dashboard');
                  setMobileMenuOpen(false);
                }}
                style={{ textAlign: 'left', fontSize: '1rem', fontWeight: 600, color: 'var(--primary-700)' }}
              >
                Mon Espace Pro
              </button>
            )}
            {user?.role === 'admin' && (
              <button
                onClick={() => {
                  onNavigate('admin');
                  setMobileMenuOpen(false);
                }}
                style={{ textAlign: 'left', fontSize: '1rem', fontWeight: 700, color: 'var(--amber-600)' }}
              >
                Tableau de Bord Admin
              </button>
            )}
            {!user && (
              <button
                onClick={() => {
                  onNavigate('auth');
                  setMobileMenuOpen(false);
                }}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Rejoindre Pont Agricole (CHR)
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
