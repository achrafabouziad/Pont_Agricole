import React from 'react';
import { Phone, Mail, MapPin, Clock, MessageSquare, ShieldCheck, Truck, Award } from 'lucide-react';

interface FooterProps {
  onNavigate?: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer style={{ backgroundColor: '#06170d', color: '#e5eee8', paddingTop: '4rem', paddingBottom: '2.5rem', marginTop: '4rem', borderTop: '1px solid #112d1b' }}>
      <div className="container">
        {/* Top Feature Highlights */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
            paddingBottom: '3rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '3rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-xs)', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-400)', flexShrink: 0 }}>
              <Truck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>Livraison Matinale Dédiée</div>
              <div style={{ fontSize: '0.82rem', color: '#9cb5a5' }}>Avant 09h00 directement dans vos cuisines</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-xs)', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6ee7b7', flexShrink: 0 }}>
              <Award size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>Fraîcheur & Calibrage CHR</div>
              <div style={{ fontSize: '0.82rem', color: '#9cb5a5' }}>Sélection rigoureuse des terroirs marocains</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-xs)', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-400)', flexShrink: 0 }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>Prix de Gros Fermes en MAD</div>
              <div style={{ fontSize: '0.82rem', color: '#9cb5a5' }}>Facturation conforme & sans intermédiaires</div>
            </div>
          </div>
        </div>

        {/* 4 Columns Links & Info */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2.5rem',
            paddingBottom: '3rem',
          }}
        >
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <img src="/logo.png" alt="Pont Agricole" style={{ width: '42px', height: '42px', objectFit: 'contain', filter: 'brightness(1.1)' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#ffffff' }}>Pont Agricole</div>
                <div style={{ fontSize: '0.65rem', color: '#4ade80', letterSpacing: '0.04em' }}>LE LIEN ENTRE LA TERRE ET L’AVENIR</div>
              </div>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#a1b8ab', lineHeight: 1.6 }}>
              Centrale d'achat et logistique maraîchère B2B pour Cafés, Restaurants, Hôtels, et Traiteurs au Royaume du Maroc.
            </p>
          </div>

          {/* Zones desservies */}
          <div>
            <h4 style={{ color: '#ffffff', marginBottom: '1rem', fontSize: '1rem', fontWeight: 700 }}>Zones de Desserte Quotidienne</h4>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.88rem', color: '#a1b8ab', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <MapPin size={14} color="#4ade80" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span><strong>Grand Casablanca</strong> : Anfa, Maarif, Gauthier, Ain Diab</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <MapPin size={14} color="#4ade80" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span><strong>Rabat - Salé</strong> : Agdal, Souissi, Hay Riad</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <MapPin size={14} color="#4ade80" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span><strong>Marrakech</strong> : Guéliz, Hivernage, Palmeraie</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <MapPin size={14} color="#4ade80" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span><strong>Tanger</strong> : Centre-Ville, Malabata & Zones CHR</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <MapPin size={14} color="#4ade80" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span><strong>Fès & Meknès</strong> : Hôtels & Restauration</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <MapPin size={14} color="#4ade80" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span><strong>Agadir</strong> : Front de Mer & Baie</span>
              </li>
            </ul>
          </div>

          {/* Catégories */}
          <div>
            <h4 style={{ color: '#ffffff', marginBottom: '1rem', fontSize: '1rem', fontWeight: 700 }}>Nos Gammes Professionnelles</h4>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.88rem', color: '#a1b8ab', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>• Légumes Maraîchers & Calibrés</li>
              <li>• Fruits de Vergers Marocains</li>
              <li>• Herbes Aromatiques Fraîches (Bottes)</li>
              <li>• Produits de Saison & Primeurs</li>
              <li>• Agrumes à Jus & Mixologie</li>
              <li>• Pommes de terre spéciales friture CHR</li>
            </ul>
          </div>

          {/* Contact Direct */}
          <div id="contact-info">
            <h4 style={{ color: '#ffffff', marginBottom: '1rem', fontSize: '1rem', fontWeight: 700 }}>Contact & Commandes</h4>
            <div style={{ fontSize: '0.88rem', color: '#a1b8ab', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Phone size={16} color="var(--amber-400)" />
                <span>+212 5 22 45 78 90</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <MessageSquare size={16} color="#4ade80" />
                <a
                  href="https://wa.me/212661987654?text=Bonjour%20Pont%20Agricole,%20je%20suis%20professionnel%20CHR%20et%20souhaite%20des%20informations"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#4ade80', textDecoration: 'underline' }}
                >
                  WhatsApp Pro : +212 6 61 98 76 54
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Mail size={16} color="var(--amber-400)" />
                <span>pro@pontagricole.ma</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                <MapPin size={16} color="#4ade80" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span>Halle aux Primeurs, Marché de Gros, Casablanca</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Clock size={16} color="var(--amber-400)" />
                <span>Clôture commandes : 21h00 la veille</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '0.8rem',
            color: '#718c7c',
          }}
        >
          <div>
            © {new Date().getFullYear()} Pont Agricole SARL-AU. Tous droits réservés. Plateforme B2B Maroc.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span>Conditions Générales de Vente B2B</span>
            <span>Politique de Confidentialité</span>
            <span>Facturation en Dirham Marocain (MAD)</span>
            {onNavigate && (
              <button
                onClick={() => onNavigate('admin')}
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: 'var(--amber-400)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
              >
                <ShieldCheck size={14} /> Espace Administration
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
