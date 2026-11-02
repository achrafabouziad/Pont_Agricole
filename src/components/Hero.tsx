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
          {/* Main Info Column */}
          <div className="hero-left-col">
            <div className="hero-badge">
              <ShieldCheck size={13} color="var(--primary-600)" />
              <span>Centrale B2B CHR • Casablanca • Rabat • Marrakech • Tanger</span>
            </div>

            <h1 className="hero-title">
              Fruits, Légumes & Herbes Fraîches{' '}
              <span style={{ color: 'var(--primary-700)', position: 'relative', display: 'inline-block' }}>
                pour les Professionnels
              </span>
            </h1>

            <p className="hero-desc">
              Approvisionnement direct et mercuriale du jour pour Cafés, Restaurants et Hôtels au Maroc.
            </p>

            {/* CTA */}
            <div className="hero-actions">
              <button onClick={onExploreCatalog} className="btn btn-primary hero-cta-btn">
                <span>Consulter le Catalogue & Prix du Jour</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Clean Micro Trust Chips */}
            <div className="hero-trust-chips">
              <span className="hero-trust-chip">
                <CheckCircle2 size={13} className="hero-trust-chip-icon" />
                <span>Facturation MAD</span>
              </span>
              <span className="hero-trust-chip">
                <Truck size={13} className="hero-trust-chip-icon" />
                <span>Livraison Dédiée CHR</span>
              </span>
              <span className="hero-trust-chip">
                <ShieldCheck size={13} className="hero-trust-chip-icon" />
                <span>Calibrage Garanti</span>
              </span>
            </div>
          </div>

          {/* Right Column: Replaces heavy photo with a sleek, compact, simple B2B status card */}
          <div className="hero-right-col">
            <div className="hero-quick-card">
              <div className="hero-quick-card-header">
                <div className="hero-quick-status">
                  <span className="hero-quick-dot" />
                  <span className="hero-quick-status-text">Commandes du Jour Ouvertes</span>
                </div>
                <span className="hero-quick-pill">Livraison J+1</span>
              </div>

              <div className="hero-quick-card-body">
                <div className="hero-quick-row">
                  <div className="hero-quick-icon-wrap">
                    <Clock size={15} />
                  </div>
                  <div>
                    <div className="hero-quick-label">Clôture des commandes</div>
                    <div className="hero-quick-value">
                      {settings?.orderCutoffTime ? `Avant ${settings.orderCutoffTime}` : 'Avant 23h00'}
                      <span className="hero-quick-subval"> (Livraison 06h - 10h)</span>
                    </div>
                  </div>
                </div>

                <div className="hero-quick-row">
                  <div className="hero-quick-icon-wrap">
                    <MapPin size={15} />
                  </div>
                  <div>
                    <div className="hero-quick-label">Zones desservies</div>
                    <div className="hero-quick-value">
                      Grand Casablanca, Rabat, Marrakech, Tanger
                    </div>
                  </div>
                </div>
              </div>

              <div className="hero-quick-card-footer">
                <button
                  type="button"
                  onClick={onExploreCatalog}
                  className="hero-quick-action"
                >
                  <span>Accéder à la mercuriale du jour</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

