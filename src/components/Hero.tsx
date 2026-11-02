import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Clock, Truck, MapPin } from 'lucide-react';
import { store } from '../services/store';
import { CompanySettings } from '../types';

interface HeroProps {
  onExploreCatalog: () => void;
  onCreateAccount: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreCatalog, onCreateAccount }) => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    let isMounted = true;
    store.getCompanySettings().then((st) => {
      if (isMounted) setSettings(st);
    });
    const unsubscribe = store.subscribe(() => {
      store.getCompanySettings().then((st) => {
        if (isMounted) setSettings(st);
      });
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-grid">
          {/* Left Column: Headlines & Call to Action */}
          <div>
            <div className="hero-badge">
              <ShieldCheck size={14} color="var(--primary-600)" />
              <span>Centrale B2B CHR • Casablanca • Rabat • Marrakech • Tanger</span>
            </div>

            <h1 className="hero-title">
              Fruits, Légumes & Herbes Fraîches{' '}
              <span style={{ color: 'var(--primary-700)', position: 'relative', display: 'inline-block' }}>
                pour les Professionnels
              </span>
            </h1>

            <p className="hero-desc">
              Légumes maraîchers calibrés pour la restauration, fruits gorgés de soleil et herbes fraîches du terroir marocain. Commandez directement en ligne avec livraison dédiée dans vos cuisines et chambres froides.
            </p>

            {/* CTAs */}
            <div className="hero-actions">
              <button onClick={onExploreCatalog} className="btn btn-primary btn-lg hero-cta-btn">
                <span>Consulter le Catalogue & Prix du Jour</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Trust Points */}
            <div className="hero-trust-grid">
              <div className="hero-trust-item">
                <CheckCircle2 size={16} className="hero-trust-icon" />
                <div>
                  <div className="hero-trust-label">Facturation en MAD</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tarifs fermes de gros</div>
                </div>
              </div>
              <div className="hero-trust-item">
                <Truck size={16} className="hero-trust-icon" />
                <div>
                  <div className="hero-trust-label">Livraison Dédiée CHR</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tournées professionnelles</div>
                </div>
              </div>
              <div className="hero-trust-item">
                <ShieldCheck size={16} className="hero-trust-icon" />
                <div>
                  <div className="hero-trust-label">Calibrage Certifié</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Zéro perte en cuisine</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Architectural Hero Visual Card */}
          <div>
            <div className="hero-img-wrap">
              <div className="hero-img-container">
                <img
                  src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1000&q=80"
                  alt="Produits frais maraîchers marocains"
                  className="hero-img"
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(10, 34, 21, 0.05) 0%, rgba(10, 34, 21, 0.45) 100%)',
                  }}
                />

                {/* Embedded Origin Capsule */}
                <div className="hero-card-origin-pill">
                  <MapPin size={13} color="var(--amber-400)" />
                  <span>Filières Maraîchères du Maroc</span>
                </div>
              </div>

              {/* Architectural Grounded Metadata Footer */}
              <div className="hero-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src="/logo.png"
                    alt="Pont Agricole"
                    style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--primary-900)', fontSize: '0.88rem', letterSpacing: '-0.01em' }}>
                      {settings?.companyName || 'Pont Agricole'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Fournisseur Agréé CHR
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-light)', paddingLeft: '1rem' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                    {settings?.orderCutoffTime ? 'Clôture Quotidienne' : 'Commandes B2B'}
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--amber-600)', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                    {settings?.orderCutoffTime ? (
                      <>
                        <Clock size={13} /> {settings.orderCutoffTime}
                      </>
                    ) : (
                      <span>Service Actif</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

