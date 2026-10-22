import React from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Clock, Truck } from 'lucide-react';

interface HeroProps {
  onExploreCatalog: () => void;
  onCreateAccount: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreCatalog, onCreateAccount }) => {
  return (
    <section
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, #ffffff 0%, var(--primary-50) 100%)',
        padding: '3.5rem 0 4.5rem',
        overflow: 'hidden',
        borderBottom: '1px solid var(--border-light)',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3rem',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Headlines & Call to Action */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--primary-100)',
                color: 'var(--primary-800)',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 700,
                marginBottom: '1.25rem',
              }}
            >
              <Sparkles size={16} color="var(--primary-600)" />
              <span>Centrale d'Achat B2B • Cafés, Restaurants, Hôtels & Traiteurs</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.1rem, 4vw, 3.2rem)',
                fontWeight: 800,
                color: 'var(--primary-900)',
                lineHeight: 1.15,
                marginBottom: '1.25rem',
                letterSpacing: '-0.02em',
              }}
            >
              Votre partenaire en{' '}
              <span style={{ color: 'var(--primary-600)', position: 'relative', display: 'inline-block' }}>
                produits frais
              </span>{' '}
              pour les professionnels
            </h1>

            <p
              style={{
                fontSize: '1.1rem',
                color: 'var(--text-muted)',
                lineHeight: 1.6,
                marginBottom: '2rem',
                maxWidth: '540px',
              }}
            >
              Fruits récoltés à maturité, légumes calibrés pour vos cuisines et herbes aromatiques fraîches cueillies à l’aube. Commandez jusqu’à 21h00, recevez dès 07h00 du matin partout au Maroc.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
              <button onClick={onCreateAccount} className="btn btn-primary btn-lg">
                <span>Créer un compte professionnel</span>
                <ArrowRight size={18} />
              </button>
              <button onClick={onExploreCatalog} className="btn btn-secondary btn-lg">
                <span>Découvrir nos produits</span>
              </button>
            </div>

            {/* Trust Points */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '1rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--border-light)',
              }}
            >
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
            <div
              style={{
                position: 'relative',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)',
                border: '4px solid #ffffff',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1000&q=80"
                alt="Produits frais maraîchers marocains"
                style={{ width: '100%', height: '440px', objectFit: 'cover', display: 'block' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(8, 40, 23, 0.1) 0%, rgba(8, 40, 23, 0.75) 100%)',
                }}
              />

              {/* Floating Banner inside image */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '1.5rem',
                  left: '1.5rem',
                  right: '1.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <img
                    src="/logo.png"
                    alt="Pont Agricole"
                    style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--primary-900)', fontSize: '0.95rem' }}>
                      Pont Agricole
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Fournisseur de confiance CHR au Maroc
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Clôture quotidienne
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--amber-600)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={14} /> 21h00
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Top Tag */}
            <div
              style={{
                position: 'absolute',
                top: '-12px',
                right: '24px',
                backgroundColor: 'var(--amber-500)',
                color: '#ffffff',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>🇲🇦 Terroirs du Maroc</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
