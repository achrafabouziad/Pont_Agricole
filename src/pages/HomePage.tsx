import React, { useState, useEffect } from 'react';
import { Hero } from '../components/Hero';
import { ProductCard } from '../components/ProductCard';
import { store } from '../services/store';
import { Category, Product } from '../types';
import { Sparkles, Utensils, Coffee, Hotel, Award, CheckCircle, ArrowRight, ShieldCheck, Clock, TrendingUp } from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onOpenCart: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectCategory, onOpenCart }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);

  useEffect(() => {
    store.getCategories().then(setCategories);
    store.getProducts().then((prods) => {
      // Pick popular / badge products
      setPopularProducts(prods.slice(0, 8));
    });
  }, []);

  const handleAddToCart = (product: Product, quantity: number) => {
    store.addToCart(product, quantity);
    onOpenCart();
  };

  return (
    <div>
      {/* 1. Hero Section */}
      <Hero
        onExploreCatalog={() => onNavigate('catalog')}
        onCreateAccount={() => onNavigate('auth')}
      />

      {/* 2. Categories Showcase */}
      <section className="home-section" style={{ padding: '4.5rem 0 2rem' }}>
        <div className="container">
          <div className="home-section-header" style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3rem' }}>
            <span className="badge badge-brand" style={{ marginBottom: '0.75rem' }}>
              Nos Filières Maraîchères
            </span>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.3rem)', color: 'var(--primary-900)', marginBottom: '0.65rem' }}>
              Une gamme complète pour votre établissement
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Des produits calibrés, cueillis à point et livrés en direct de nos producteurs partenaires à travers le Maroc.
            </p>
          </div>

          <div
            className="home-categories-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  onNavigate('catalog');
                }}
                className="card category-card-home"
                style={{
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  height: '280px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '1.5rem',
                }}
              >
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.4s ease',
                  }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.transform = 'scale(1)')}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(8, 40, 23, 0.1) 0%, rgba(8, 40, 23, 0.85) 100%)',
                  }}
                />

                <div style={{ position: 'relative', zIndex: 2 }}>
                  <h3 className="home-cat-title" style={{ color: '#ffffff', fontSize: '1.35rem', marginBottom: '0.35rem' }}>
                    {cat.name}
                  </h3>
                  <p className="home-cat-desc" style={{ color: '#d8e5dd', fontSize: '0.82rem', marginBottom: '0.85rem', lineHeight: 1.4 }}>
                    {cat.description}
                  </p>
                  <span
                    className="home-cat-link"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: 'var(--amber-400)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  >
                    <span>Explorer la gamme</span>
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Popular Fresh Produce Selection */}
      <section style={{ padding: '3.5rem 0 4.5rem' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
            <div>
              <span className="badge badge-amber" style={{ marginBottom: '0.5rem' }}>
                Sélection du Jour
              </span>
              <h2 style={{ fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)', color: 'var(--primary-900)' }}>
                Produits Populaires chez les Chefs
              </h2>
            </div>
            <button
              onClick={() => onNavigate('catalog')}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>Voir tout le catalogue</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="catalog-grid">
            {popularProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Avantages CHR (Why Pont Agricole) */}
      <section id="advantages" style={{ backgroundColor: '#ffffff', padding: '5rem 0', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 3.5rem' }}>
            <span className="badge badge-brand" style={{ marginBottom: '0.75rem' }}>
              Standard D'Excellence CHR
            </span>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.3rem)', color: 'var(--primary-950)', marginBottom: '0.85rem' }}>
              Conçu pour les Exigences de la Restauration
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.98rem', lineHeight: 1.6 }}>
              Gagnez du temps sur vos achats, sécurisez votre rentabilité et garantissez à vos clients des assiettes de premier choix.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.5rem',
            }}
          >
            <div className="card" style={{ padding: '2rem 1.75rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-xs)', backgroundColor: '#ffffff', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-700)', marginBottom: '1.25rem' }}>
                <Clock size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--primary-900)' }}>Livraisons Ultra-Matinales</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Vos commandes sont livrées avant 09h00 du matin directement dans vos chambres froides, prêtes pour vos mises en place de midi.
              </p>
            </div>

            <div className="card" style={{ padding: '2rem 1.75rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-xs)', backgroundColor: '#ffffff', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-600)', marginBottom: '1.25rem' }}>
                <TrendingUp size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--primary-900)' }}>Tarifs de Gros Stables en MAD</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Prix négociés en amont avec les producteurs pour vous prémunir de la volatilité des cours du marché de gros.
              </p>
            </div>

            <div className="card" style={{ padding: '2rem 1.75rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-xs)', backgroundColor: '#ffffff', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-700)', marginBottom: '1.25rem' }}>
                <Award size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--primary-900)' }}>Calibrage et Tri Rigoureux</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Zéro perte en cuisine. Chaque lot est minutieusement vérifié pour respecter vos calibres de découpe, friture ou dressage.
              </p>
            </div>

            <div className="card" style={{ padding: '2rem 1.75rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-xs)', backgroundColor: '#ffffff', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-600)', marginBottom: '1.25rem' }}>
                <ShieldCheck size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--primary-900)' }}>Facturation Conforme & Rapprochée</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Bons de livraison clairs, facturation mensuelle ou hebdomadaire avec relevés d'achats précis pour votre comptabilité.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Destiné aux CHR (Cafés, Restaurants, Hôtels) */}
      <section style={{ padding: '5rem 0', backgroundColor: 'var(--bg-main)' }}>
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '3rem',
              alignItems: 'center',
            }}
          >
            <div>
              <span className="badge badge-brand" style={{ marginBottom: '0.75rem' }}>
                Solutions Sur Mesure
              </span>
              <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.3rem)', color: 'var(--primary-950)', marginBottom: '1rem' }}>
                Cafés, Restaurants, Hôtels & Traiteurs
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.98rem', lineHeight: 1.65, marginBottom: '2rem' }}>
                Que vous soyez une brasserie casablancaise, un riad à Marrakech ou un complexe hôtelier à Agadir ou Tanger, Pont Agricole adapte ses volumes et ses fréquences de livraison à votre rythme.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-xs)', backgroundColor: '#ffffff', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-700)', flexShrink: 0 }}>
                    <Utensils size={18} />
                  </div>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--primary-900)', fontSize: '0.95rem', marginBottom: '0.15rem' }}>Restaurants Gastronomiques & Brasseries</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>Herbes fraîches cueillies le matin même, primeurs et légumes calibrés au millimètre.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-xs)', backgroundColor: '#ffffff', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-700)', flexShrink: 0 }}>
                    <Hotel size={18} />
                  </div>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--primary-900)', fontSize: '0.95rem', marginBottom: '0.15rem' }}>Hôtels & Resorts</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>Volumes importants pour buffets et petits-déjeuners (oranges à jus, bananes, pastèques en saison).</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-xs)', backgroundColor: '#ffffff', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-700)', flexShrink: 0 }}>
                    <Coffee size={18} />
                  </div>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--primary-900)', fontSize: '0.95rem', marginBottom: '0.15rem' }}>Cafés & Salons de Thé</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>Menthe fraîche marocaine sélectionnée, citrons juteux et fruits pour jus pressés minute.</span>
                  </div>
                </div>
              </div>

              <button onClick={() => onNavigate('auth')} className="btn btn-primary">
                <span>Ouvrir un compte professionnel</span>
                <ArrowRight size={17} />
              </button>
            </div>

            <div>
              <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-md)', backgroundColor: '#ffffff' }}>
                <img
                  src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80"
                  alt="Cuisine de restaurant professionnel"
                  style={{ width: '100%', height: '420px', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Comment ça marche */}
      <section style={{ backgroundColor: '#ffffff', padding: '5rem 0', borderTop: '1px solid var(--border-light)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3.5rem' }}>
            <span className="badge badge-brand" style={{ marginBottom: '0.75rem' }}>
              Protocole Logistique
            </span>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.3rem)', color: 'var(--primary-950)', marginBottom: '0.85rem' }}>
              Comment commander chez Pont Agricole ?
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.98rem', lineHeight: 1.6 }}>
              Trois étapes rigoureuses pour fluidifier vos approvisionnements quotidiens.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.75rem',
            }}
          >
            <div className="card" style={{ padding: '2rem 1.75rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-light)',
                  color: 'var(--primary-800)',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                  letterSpacing: '0.04em',
                }}
              >
                01
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--primary-900)' }}>Inscription Professionnelle</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Renseignez la raison sociale de votre établissement, votre numéro de téléphone et votre adresse de livraison exacte.
              </p>
            </div>

            <div className="card" style={{ padding: '2rem 1.75rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-light)',
                  color: 'var(--amber-700)',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                  letterSpacing: '0.04em',
                }}
              >
                02
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--primary-900)' }}>Commande avant 21h00</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Composez votre panier en quelques clics : cagettes calibrées, cartons, caisses, bottes ou kilogrammes selon vos recettes.
              </p>
            </div>

            <div className="card" style={{ padding: '2rem 1.75rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-light)',
                  color: 'var(--primary-800)',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                  letterSpacing: '0.04em',
                }}
              >
                03
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--primary-900)' }}>Livraison Dès 07h00</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Nos chauffeurs-livreurs déposent vos cagettes directement dans vos cuisines avant l'arrivée de votre brigade de chefs.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

