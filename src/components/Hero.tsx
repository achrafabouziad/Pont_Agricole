import React from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Clock, Truck, MapPin } from 'lucide-react';

interface HeroProps {
  onExploreCatalog: () => void;
  onCreateAccount: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreCatalog, onCreateAccount }) => {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-grid">
          {/* Left Column: Headlines & Call to Action */}
          <div>
            <div className="hero-badge">
              <Sparkles size={16} color="var(--primary-600)" />
              <span>Centrale d'Achat B2B • Cafés, Restaurants, Hôtels & Traiteurs</span>
            </div>

            <h1 className="hero-title">
              Votre partenaire en{' '}
              <span style={{ color: 'var(--primary-600)', position: 'relative', display: 'inline-block' }}>
                produits frais
              </span>{' '}
              pour les professionnels
            </h1>

            <p className="hero-desc">
              Fruits récoltés à maturité, légumes calibrés pour vos cuisines et herbes aromatiques fraîches cueillies à l’aube. Commandez jusqu’à 21h00, recevez dès 07h00 du matin partout au Maroc.
            </p>

            {/* CTAs */}
            <div className="hero-actions">
              <button onClick={onCreateAccount} className="btn btn-primary btn-lg">
                <span>Créer un compte professionnel</span>
                <ArrowRight size={18} />
              </button>
              <button onClick={onExploreCatalog} className="btn btn-secondary btn-lg">
                <span>Découvrir nos produits</span>
              </button>
            </div>

            {/* Trust Points */}
            <div className="hero-trust-grid">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} color="var(--primary-600)" />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Facturation en MAD (DH)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={18} color="var(--primary-600)" />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Livraison avant 09h00
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color="var(--primary-600)" />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Qualité calibrée CHR
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual with Product Badge */}
          <div style={{ position: 'relative' }}>
            {/* Visual Card Frame */}
            <div className="hero-img-wrap">
              <img
                src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1000&q=80"
                alt="Produits frais maraîchers marocains"
                className="hero-img"
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(8, 40, 23, 0.1) 0%, rgba(8, 40, 23, 0.75) 100%)',
                }}
              />

              {/* Floating Banner inside image */}
              <div className="hero-floating-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src="/logo.png"
                    alt="Pont Agricole"
                    style={{ width: '38px', height: '38px', objectFit: 'contain' }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--primary-900)', fontSize: '0.9rem' }}>
                      Pont Agricole
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Fournisseur CHR au Maroc
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Clôture
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--amber-600)', display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}>
                    <Clock size={13} /> 21h00
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Top Tag */}
            <div className="hero-floating-pill">
              <MapPin size={13} />
              <span>Filières Maraîchères du Maroc</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
