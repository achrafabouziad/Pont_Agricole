import React from 'react';
import { Order, CompanySettings } from '../types';
import { Printer, X, FileText, CheckCircle, MapPin, Phone, Mail, Building2, Calendar, ShieldCheck } from 'lucide-react';

interface InvoiceModalProps {
  order: Order | null;
  onClose: () => void;
  settings?: CompanySettings | null;
}

// Convert numbers to French words for Moroccan legal invoices
function numberToFrenchWords(num: number): string {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

  const convertLessThanOneThousand = (n: number): string => {
    if (n === 0) return '';
    let result = '';

    if (n >= 100) {
      const hundredDigit = Math.floor(n / 100);
      if (hundredDigit === 1) {
        result += 'cent ';
      } else {
        result += units[hundredDigit] + ' cent ';
      }
      n %= 100;
    }

    if (n >= 20) {
      const tenDigit = Math.floor(n / 10);
      const unitDigit = n % 10;
      if (tenDigit === 7) {
        result += 'soixante-' + teens[unitDigit] + ' ';
      } else if (tenDigit === 9) {
        result += 'quatre-vingt-' + teens[unitDigit] + ' ';
      } else {
        result += tens[tenDigit];
        if (unitDigit === 1) {
          result += ' et un ';
        } else if (unitDigit > 1) {
          result += '-' + units[unitDigit] + ' ';
        } else {
          result += ' ';
        }
      }
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
    } else if (n > 0) {
      result += units[n] + ' ';
    }

    return result.trim();
  };

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return 'zéro Dirham';

  let words = '';
  if (integerPart >= 1000000) {
    const millions = Math.floor(integerPart / 1000000);
    words += convertLessThanOneThousand(millions) + ' million' + (millions > 1 ? 's ' : ' ');
  }

  const thousands = Math.floor((integerPart % 1000000) / 1000);
  if (thousands > 0) {
    if (thousands === 1) {
      words += 'mille ';
    } else {
      words += convertLessThanOneThousand(thousands) + ' mille ';
    }
  }

  const remainder = integerPart % 1000;
  if (remainder > 0) {
    words += convertLessThanOneThousand(remainder);
  }

  words = words.trim() + ' Dirhams';

  if (decimalPart > 0) {
    words += ' et ' + convertLessThanOneThousand(decimalPart) + ' centimes';
  }

  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose, settings }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = `FAC-${order.orderNumber.replace('#', '')}`;
  const formattedOrderDate = new Date(order.createdAt).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedOrderTime = new Date(order.createdAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalInWords = numberToFrenchWords(order.total);

  return (
    <div className="invoice-modal-backdrop" onClick={onClose}>
      <div
        className="invoice-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden when printing) */}
        <div className="invoice-controls no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ padding: '0.4rem', backgroundColor: 'var(--primary-100)', color: 'var(--primary-800)', borderRadius: '8px' }}>
              <FileText size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--primary-900)', fontWeight: 700 }}>
                Facture & Bon de Livraison {order.orderNumber}
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Document officiel B2B conforme aux normes fiscales marocaines
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={handlePrint}
              className="btn btn-primary"
              style={{
                backgroundColor: '#166534',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.15rem',
                borderRadius: '8px',
              }}
            >
              <Printer size={16} />
              <span>Imprimer / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{
                fontSize: '0.85rem',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <X size={16} />
              <span>Fermer</span>
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div id="invoice-printable-area" className="invoice-sheet">
          {/* Header row: Brand & Invoice Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #166534', paddingBottom: '1.5rem', marginBottom: '1.5rem', gap: '1.5rem' }}>
            {/* Company Info Left */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
                <img src="/logo.png" alt="Pont Agricole" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#166534', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    PONT AGRICOLE SARL
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    CENTRALE D'ACHAT & LOGISTIQUE MARAÎCHÈRE CHR
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5, marginTop: '0.5rem' }}>
                <div>Boulevard d'Anfa, Quartier Racine, Casablanca, Maroc</div>
                <div>Tél : +212 5 22 40 50 60 | Mobile : +212 6 61 23 45 67</div>
                <div>Email : facturation@pontagricole.ma | Web : www.pontagricole.ma</div>
              </div>
            </div>

            {/* Document Title Right */}
            <div style={{ textAlign: 'right', minWidth: '240px' }}>
              <div style={{ display: 'inline-block', backgroundColor: '#166534', color: '#ffffff', padding: '0.45rem 1rem', borderRadius: '6px', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.04em', marginBottom: '0.6rem' }}>
                FACTURE COMMERCIALE
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>VALANT BON DE LIVRAISON B2B</div>

              <div style={{ marginTop: '0.6rem', fontSize: '0.85rem', color: '#0f172a' }}>
                <div><strong>N° Facture :</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', color: '#166534', fontWeight: 700 }}>{invoiceNumber}</span></div>
                <div><strong>Réf. Commande :</strong> {order.orderNumber}</div>
                <div><strong>Date Commande :</strong> {formattedOrderDate} à {formattedOrderTime}</div>
                <div><strong>Date de Livraison :</strong> <span style={{ fontWeight: 700, color: '#166534' }}>{order.requestedDeliveryDate}</span></div>
              </div>
            </div>
          </div>

          {/* Parties Meta: Emetteur & Client */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
            {/* Emetteur Legal Mentions */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#334155' }}>
              <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.85rem', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Fournisseur / Émetteur
              </div>
              <div><strong>Raison Sociale :</strong> PONT AGRICOLE SARL</div>
              <div><strong>ICE :</strong> 003291845000082</div>
              <div><strong>IF :</strong> 52841930 | <strong>RC :</strong> 584920 Casablanca</div>
              <div><strong>Patente :</strong> 37492018 | <strong>CNSS :</strong> 4829105</div>
              <div><strong>Compte Bancaire :</strong> Attijariwafa Bank 007 780 0001234567890123 45</div>
            </div>

            {/* Client B2B Facturé */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#334155' }}>
              <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.85rem', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Client Professionnel CHR
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                {order.businessName || 'Établissement Professionnel'}
              </div>
              {order.businessType && (
                <div style={{ textTransform: 'capitalize', color: '#64748b', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                  Secteur : {order.businessType}
                </div>
              )}
              <div><strong>Contact :</strong> {order.customerName || 'Responsable des Achats / Chef Économe'}</div>
              <div><strong>Téléphone :</strong> {order.customerPhone}</div>
              <div><strong>Adresse de Livraison :</strong> {order.deliveryAddress}, {order.deliveryCity}</div>
            </div>
          </div>

          {/* Table of Fresh Produce Items */}
          <div style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#166534', color: '#ffffff', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, width: '70px' }}>Réf.</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Désignation des Fruits & Légumes</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, textAlign: 'center', width: '110px' }}>Condit.</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, textAlign: 'right', width: '75px' }}>Qté</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, textAlign: 'right', width: '110px' }}>P.U. HT (MAD)</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, textAlign: 'right', width: '120px' }}>Total Ligne (MAD)</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfc',
                    }}
                  >
                    <td style={{ padding: '0.6rem 0.75rem', color: '#64748b', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                      #{idx + 1}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#0f172a' }}>
                      {item.productNameSnapshot}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', color: '#475569', textTransform: 'capitalize' }}>
                      {item.unitSnapshot}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#334155' }}>
                      {item.unitPriceSnapshot.toFixed(2)} DH
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                      {item.lineTotal.toFixed(2)} DH
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary & Amount in Words */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem', marginBottom: '1.75rem', alignItems: 'start' }}>
            {/* Amount in Words and Legal Mentions Left */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
              <div style={{ fontWeight: 700, color: '#166534', marginBottom: '0.35rem' }}>
                Arrêté de la Présente Facture :
              </div>
              <div style={{ fontStyle: 'italic', color: '#1e293b', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                « Arrêtée la présente facture à la somme nette de <strong>{totalInWords}</strong> TTC. »
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                <div><strong>Régime fiscal TVA :</strong> Fruits et légumes frais bruts non transformés exonérés de TVA conformément à l'article 91-I-1° du Code Général des Impôts marocain.</div>
                <div><strong>Mode de règlement :</strong> Paiement à réception matinale / Virement bancaire CHR.</div>
              </div>

              {order.customerNotes && (
                <div style={{ marginTop: '0.6rem', padding: '0.45rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '4px', fontSize: '0.76rem', color: '#92400e' }}>
                  <strong>Note de livraison :</strong> "{order.customerNotes}"
                </div>
              )}
            </div>

            {/* Financial Summary Calculation Right */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1.5px solid #166534', overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                <span style={{ color: '#475569' }}>Total Brut HT</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{order.subtotal.toFixed(2)} DH</span>
              </div>

              <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                <span style={{ color: '#475569' }}>Frais de Livraison</span>
                <span style={{ fontWeight: 700, color: '#166534' }}>
                  {order.deliveryFee > 0 ? `${order.deliveryFee.toFixed(2)} DH` : 'Gratuite (Offerte)'}
                </span>
              </div>

              <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                <span style={{ color: '#475569' }}>TVA Maraîchère (0% Art. 91 CGI)</span>
                <span style={{ fontWeight: 700, color: '#166534' }}>0.00 DH (Exonéré)</span>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#166534' }}>NET À PAYER TTC</div>
                  <div style={{ fontSize: '0.7rem', color: '#15803d' }}>En Dirhams Marocains (MAD)</div>
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#166534' }}>
                  {order.total.toFixed(2)} DH
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Inspection & Signature Area */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px solid #cbd5e1', paddingTop: '1.25rem', marginBottom: '1rem' }}>
            {/* Signature Pont Agricole */}
            <div style={{ textAlign: 'center', border: '1px dashed #cbd5e1', padding: '1rem', borderRadius: '6px', minHeight: '110px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', marginBottom: '0.35rem' }}>
                Pour PONT AGRICOLE SARL
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Service Logistique & Expéditions Matinales
              </div>
              <div style={{ marginTop: '1.5rem', fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                [Cachet et Signature Émetteur]
              </div>
            </div>

            {/* Signature Client Recommandataire */}
            <div style={{ textAlign: 'center', border: '1px dashed #cbd5e1', padding: '1rem', borderRadius: '6px', minHeight: '110px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', marginBottom: '0.35rem' }}>
                Pour le Client (Bon pour Réception Conforme)
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Signature du Chef Économe / Réceptionnaire
              </div>
              <div style={{ marginTop: '1.5rem', fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                Date & Heure de Réception : ____/____/2026 à ____:____
              </div>
            </div>
          </div>

          {/* Legal Footnote */}
          <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', lineHeight: 1.4 }}>
            Pont Agricole SARL au capital de 1.000.000 DH · ICE: 003291845000082 · IF: 52841930 · RC Casablanca 584920 · Patente 37492018 · CNSS 4829105<br />
            Marchandises fraîches vérifiées au départ. Tout litige relève de la compétence exclusive du Tribunal de Commerce de Casablanca.
          </div>
        </div>
      </div>
    </div>
  );
};
