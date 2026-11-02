import React, { useState, useEffect } from 'react';
import { Order, CompanySettings } from '../types';
import {
  Printer,
  X,
  FileText,
  CheckCircle,
  Edit2,
  Save,
  Plus,
  Trash2,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { store } from '../services/store';

interface InvoiceModalProps {
  order: Order | null;
  onClose: () => void;
  settings?: CompanySettings | null;
}

interface InvoiceRowItem {
  id: string;
  designation: string;
  caisses: number;
  qteKg: number;
  puKg: number;
  montantHt: number;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose, settings: propsSettings }) => {
  const [liveSettings, setLiveSettings] = useState<CompanySettings | null>(propsSettings || null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [savingNotice, setSavingNotice] = useState<string | null>(null);

  // Header state
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoicePhone, setInvoicePhone] = useState<string>('0707296123');
  const [invoiceDate, setInvoiceDate] = useState<string>('');

  // Facturé à state
  const [businessName, setBusinessName] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerIce, setCustomerIce] = useState<string>('');
  const [deliveryCity, setDeliveryCity] = useState<string>('');
  const [customerCode, setCustomerCode] = useState<string>('');

  // Items table state
  const [rows, setRows] = useState<InvoiceRowItem[]>([]);

  // Remises & TVA state
  const [remiseLegumes, setRemiseLegumes] = useState<number>(0);
  const [remiseGratuit, setRemiseGratuit] = useState<number>(0);
  const [totalTva, setTotalTva] = useState<number>(0);

  // Initialize and auto-populate all fields from the order
  const initFromOrder = () => {
    if (!order) return;

    if (!propsSettings) {
      store.getCompanySettings().then((st) => {
        setLiveSettings(st);
        if (st.phone) setInvoicePhone(st.phone);
      });
    } else {
      setLiveSettings(propsSettings);
      if (propsSettings.phone) setInvoicePhone(propsSettings.phone);
    }

    // Auto lookup business ICE if not on order
    store.getBusinesses().then((bizList) => {
      const match = bizList.find(
        (b) => b.id === order.businessId || b.ownerId === order.customerId || b.phone === order.customerPhone
      );
      if (match?.ice) {
        setCustomerIce(match.ice);
      }
    });

    const num = order.orderNumber.replace('#', '').replace(/^PA-/, '');
    setInvoiceNumber(num || '001');

    const formattedDate = order.requestedDeliveryDate
      ? order.requestedDeliveryDate
      : new Date(order.createdAt).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
    setInvoiceDate(formattedDate);

    setBusinessName(order.businessName || order.customerName || '');
    setDeliveryAddress(order.deliveryAddress || '');
    setCustomerPhone(order.customerPhone || '');
    setCustomerIce(order.customerIce || '');
    setDeliveryCity(order.deliveryCity || 'Casablanca');
    setCustomerCode(order.customerId ? order.customerId.slice(-6).toUpperCase() : 'CLT-01');

    // Auto-map items
    const mappedRows: InvoiceRowItem[] = (order.items || []).map((item, idx) => {
      const isCaisse = item.unitSnapshot === 'caisse' || item.unitSnapshot === 'carton';
      const caissesCount = isCaisse ? item.quantity : 1;
      const qte = item.unitSnapshot === 'kg' ? item.quantity : item.quantity * 10;
      return {
        id: item.productId || `row-${idx}`,
        designation: item.productNameSnapshot || '',
        caisses: caissesCount,
        qteKg: qte,
        puKg: item.unitPriceSnapshot || 0,
        montantHt: item.lineTotal || 0,
      };
    });

    setRows(mappedRows);
    setRemiseLegumes(0);
    setRemiseGratuit(0);
    setTotalTva(0);
  };

  useEffect(() => {
    initFromOrder();
  }, [order, propsSettings]);

  if (!order) return null;

  const handlePrint = () => {
    // Switch to clean preview mode before printing if currently editing
    setIsEditing(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Calculations
  const totalCaisses = rows.reduce((acc, r) => acc + (Number(r.caisses) || 0), 0);
  const totalHT = rows.reduce((acc, r) => acc + (Number(r.montantHt) || 0), 0);
  const totalTTC = Math.max(
    0,
    totalHT + (Number(totalTva) || 0) - (Number(remiseLegumes) || 0) - (Number(remiseGratuit) || 0)
  );

  // Row update handlers
  const handleRowChange = (index: number, field: keyof InvoiceRowItem, val: any) => {
    setRows((prev) => {
      const next = [...prev];
      const cur = { ...next[index], [field]: val };
      if (field === 'qteKg' || field === 'puKg') {
        const qte = field === 'qteKg' ? Number(val) || 0 : Number(cur.qteKg) || 0;
        const pu = field === 'puKg' ? Number(val) || 0 : Number(cur.puKg) || 0;
        cur.montantHt = Math.round(qte * pu * 100) / 100;
      }
      next[index] = cur;
      return next;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        designation: '',
        caisses: 1,
        qteKg: 10,
        puKg: 0,
        montantHt: 0,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveToOrder = async () => {
    if (!order) return;
    try {
      const updatedOrder: Order = {
        ...order,
        businessName,
        deliveryAddress,
        customerPhone,
        deliveryCity,
        customerIce,
        subtotal: totalHT,
        total: totalTTC,
        items: rows.map((r) => ({
          productId: r.id,
          productNameSnapshot: r.designation,
          unitSnapshot: 'caisse',
          unitPriceSnapshot: r.puKg,
          quantity: r.caisses,
          lineTotal: r.montantHt,
        })),
      };
      await store.updateOrder(updatedOrder);
      setSavingNotice('Facture modifiée et enregistrée avec succès !');
      setTimeout(() => setSavingNotice(null), 3500);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving invoice changes', err);
    }
  };

  // Pad rows up to minimum 5 rows matching the template design
  const displayRowsCount = Math.max(5, rows.length);
  const emptyRowsNeeded = Math.max(0, 5 - rows.length);

  return (
    <div className="invoice-modal-backdrop" onClick={onClose}>
      <div
        className="invoice-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden when printing) */}
        <div className="invoice-header-bar no-print">
          <div className="invoice-header-top">
            <div className="invoice-header-title-wrap">
              <div className="invoice-header-icon">
                <FileText size={17} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 className="invoice-header-title">Facture Officielle Pont Agricole</h3>
                <p className="invoice-header-subtitle">
                  Facture #{invoiceNumber || '---'} • {invoiceDate}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="invoice-close-btn"
              title="Fermer la facture"
              type="button"
            >
              <X size={17} />
            </button>
          </div>

          <div className="invoice-actions-row">
            {/* Toggle Edit Mode */}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`invoice-action-btn ${isEditing ? 'edit-active' : ''}`}
            >
              {isEditing ? (
                <>
                  <Eye size={14} />
                  <span>Aperçu</span>
                </>
              ) : (
                <>
                  <Edit2 size={14} />
                  <span>Modifier la Facture</span>
                </>
              )}
            </button>

            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleSaveToOrder}
                  className="invoice-action-btn save-btn"
                >
                  <Save size={14} />
                  <span>Enregistrer</span>
                </button>
                <button
                  type="button"
                  onClick={initFromOrder}
                  className="invoice-action-btn"
                  title="Rétablir les données d'origine"
                >
                  <RotateCcw size={14} />
                </button>
              </>
            )}

            <button
              onClick={handlePrint}
              className="invoice-action-btn print-btn"
              type="button"
            >
              <Printer size={14} />
              <span>Imprimer / PDF</span>
            </button>
          </div>
        </div>

        {savingNotice && (
          <div
            className="no-print"
            style={{
              padding: '0.65rem 1.25rem',
              backgroundColor: '#f0fdf4',
              borderBottom: '1px solid #bbf7d0',
              color: '#166534',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <CheckCircle size={16} />
            <span>{savingNotice}</span>
          </div>
        )}

        {isEditing && (
          <div
            className="no-print"
            style={{
              padding: '0.55rem 1.25rem',
              backgroundColor: '#fffbeb',
              borderBottom: '1px solid #fef3c7',
              color: '#b45309',
              fontSize: '0.78rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span>
              ✍️ <strong>Mode Édition Activé :</strong> Modifiez n'importe quel champ directement.
            </span>
            <button
              type="button"
              onClick={handleAddRow}
              style={{
                border: '1px solid #d97706',
                backgroundColor: '#ffffff',
                color: '#b45309',
                borderRadius: '6px',
                padding: '0.25rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Plus size={13} /> Ajouter un produit
            </button>
          </div>
        )}

        {/* Scrollable Container with Sheet Paper */}
        <div className="invoice-scroll-area">
          <div className="invoice-scroll-hint no-print">
            <span>↔ Glissez horizontalement pour voir le tableau complet</span>
          </div>

          <div id="invoice-printable-area" className="invoice-official-paper">
            {/* Top Logo & Title */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <img
                src="/logo.png"
                alt="Pont Agricole"
                style={{ width: '80px', height: 'auto', margin: '0 auto 2px', display: 'block', objectFit: 'contain' }}
              />
              <div
                style={{
                  fontSize: '2.1rem',
                  fontWeight: 900,
                  color: '#000000',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                Facture
              </div>
            </div>

            {/* Subheader Row: N°, TEL, DATE */}
            <div className="invoice-subhead-row">
              <div>
                <strong>N°: </strong>
                {isEditing ? (
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    style={{
                      border: '1px dashed #000',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      padding: '2px 4px',
                      width: '115px',
                    }}
                  />
                ) : (
                  <span>{invoiceNumber || '..............'}</span>
                )}
              </div>

              <div>
                <strong>TEL : </strong>
                {isEditing ? (
                  <input
                    type="text"
                    value={invoicePhone}
                    onChange={(e) => setInvoicePhone(e.target.value)}
                    style={{
                      border: '1px dashed #000',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      padding: '2px 4px',
                      width: '120px',
                    }}
                  />
                ) : (
                  <span>{invoicePhone || '0707296123'}</span>
                )}
              </div>

              <div>
                <strong>DATE : </strong>
                {isEditing ? (
                  <input
                    type="text"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    style={{
                      border: '1px dashed #000',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      padding: '2px 4px',
                      width: '110px',
                    }}
                  />
                ) : (
                  <span>{invoiceDate || '../../....'}</span>
                )}
              </div>
            </div>

            {/* Box: Facturé à */}
            <div className="invoice-billed-box">
              <div
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 900,
                  color: '#000000',
                  marginBottom: '6px',
                  lineHeight: 1.2,
                }}
              >
                Facturé à
              </div>

              <div className="invoice-billed-grid">
                {/* Left Column */}
                <div>
                  <div className="invoice-billed-line">
                    <strong className="invoice-billed-label">Raison Sociale :</strong>
                    {isEditing ? (
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        style={{
                          border: '1px dashed #000',
                          fontSize: '0.85rem',
                          padding: '1px 4px',
                          width: '100%',
                          fontWeight: 700,
                        }}
                      />
                    ) : (
                      <span className="invoice-billed-val" style={{ fontWeight: 800 }}>{businessName || '..............'}</span>
                    )}
                  </div>

                  <div className="invoice-billed-line">
                    <strong className="invoice-billed-label">Adresse :</strong>
                    {isEditing ? (
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        style={{
                          border: '1px dashed #000',
                          fontSize: '0.85rem',
                          padding: '1px 4px',
                          width: '100%',
                        }}
                      />
                    ) : (
                      <span className="invoice-billed-val">{deliveryAddress || '..............'}</span>
                    )}
                  </div>

                  <div className="invoice-billed-line">
                    <strong className="invoice-billed-label">Télephone :</strong>
                    {isEditing ? (
                      <input
                        type="text"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        style={{
                          border: '1px dashed #000',
                          fontSize: '0.85rem',
                          padding: '1px 4px',
                          width: '100%',
                        }}
                      />
                    ) : (
                      <span className="invoice-billed-val">{customerPhone || '..............'}</span>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  <div className="invoice-billed-line">
                    <strong className="invoice-billed-label">Ice :</strong>
                    {isEditing ? (
                      <input
                        type="text"
                        value={customerIce}
                        onChange={(e) => setCustomerIce(e.target.value)}
                        style={{
                          border: '1px dashed #000',
                          fontSize: '0.85rem',
                          padding: '1px 4px',
                          width: '100%',
                        }}
                      />
                    ) : (
                      <span className="invoice-billed-val">{customerIce || '..............'}</span>
                    )}
                  </div>

                  <div className="invoice-billed-line">
                    <strong className="invoice-billed-label">ville :</strong>
                    {isEditing ? (
                      <input
                        type="text"
                        value={deliveryCity}
                        onChange={(e) => setDeliveryCity(e.target.value)}
                        style={{
                          border: '1px dashed #000',
                          fontSize: '0.85rem',
                          padding: '1px 4px',
                          width: '100%',
                        }}
                      />
                    ) : (
                      <span className="invoice-billed-val">{deliveryCity || '..............'}</span>
                    )}
                  </div>

                  <div className="invoice-billed-line">
                    <strong className="invoice-billed-label">code :</strong>
                    {isEditing ? (
                      <input
                        type="text"
                        value={customerCode}
                        onChange={(e) => setCustomerCode(e.target.value)}
                        style={{
                          border: '1px dashed #000',
                          fontSize: '0.85rem',
                          padding: '1px 4px',
                          width: '100%',
                        }}
                      />
                    ) : (
                      <span className="invoice-billed-val">{customerCode || '..............'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Table: Produce Items (#, Désignation, Caisses, Qté kg, Pu/KG, Montant HT) */}
            <div className="invoice-table-wrapper">
              <table>
                <thead>
                  <tr style={{ borderBottom: '2.5px solid #000000' }}>
                    <th style={{ borderRight: '2px solid #000000', padding: '8px 4px', textAlign: 'center', width: '38px', fontWeight: 900, fontSize: '0.92rem' }}>
                      #
                    </th>
                    <th style={{ borderRight: '2px solid #000000', padding: '8px 8px', textAlign: 'center', fontWeight: 900, fontSize: '0.92rem' }}>
                      Désignation
                    </th>
                    <th style={{ borderRight: '2px solid #000000', padding: '8px 6px', textAlign: 'center', width: '70px', fontWeight: 900, fontSize: '0.92rem' }}>
                      Caisses
                    </th>
                    <th style={{ borderRight: '2px solid #000000', padding: '8px 6px', textAlign: 'center', width: '80px', fontWeight: 900, fontSize: '0.92rem' }}>
                      Qté kg
                    </th>
                    <th style={{ borderRight: '2px solid #000000', padding: '8px 6px', textAlign: 'center', width: '80px', fontWeight: 900, fontSize: '0.92rem' }}>
                      Pu/KG
                    </th>
                    <th style={{ padding: '8px 8px', textAlign: 'center', width: '105px', fontWeight: 900, fontSize: '0.92rem' }}>
                      Montant HT
                    </th>
                    {isEditing && (
                      <th className="no-print" style={{ borderLeft: '2px solid #000000', padding: '6px 4px', width: '32px' }}></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {/* Active data rows */}
                  {rows.map((row, idx) => (
                    <tr key={row.id} style={{ height: '36px' }}>
                      <td style={{ borderRight: '2px solid #000000', borderBottom: '1px solid #e2e8f0', padding: '6px 4px', textAlign: 'center', fontWeight: 900, fontSize: '0.92rem' }}>
                        {idx + 1}
                      </td>
                      <td style={{ borderRight: '2px solid #000000', borderBottom: '1px solid #e2e8f0', padding: '6px 8px', fontSize: '0.9rem' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={row.designation}
                            onChange={(e) => handleRowChange(idx, 'designation', e.target.value)}
                            style={{ width: '100%', border: '1px dashed #000', padding: '2px 4px', fontSize: '0.88rem' }}
                          />
                        ) : (
                          <span>{row.designation}</span>
                        )}
                      </td>
                      <td style={{ borderRight: '2px solid #000000', borderBottom: '1px solid #e2e8f0', padding: '6px 4px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700 }}>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={row.caisses}
                            onChange={(e) => handleRowChange(idx, 'caisses', Number(e.target.value))}
                            style={{ width: '50px', border: '1px dashed #000', textAlign: 'center', padding: '2px' }}
                          />
                        ) : (
                          <span>{row.caisses || ''}</span>
                        )}
                      </td>
                      <td style={{ borderRight: '2px solid #000000', borderBottom: '1px solid #e2e8f0', padding: '6px 4px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700 }}>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={row.qteKg}
                            onChange={(e) => handleRowChange(idx, 'qteKg', Number(e.target.value))}
                            style={{ width: '55px', border: '1px dashed #000', textAlign: 'center', padding: '2px' }}
                          />
                        ) : (
                          <span>{row.qteKg ? row.qteKg.toFixed(1) : ''}</span>
                        )}
                      </td>
                      <td style={{ borderRight: '2px solid #000000', borderBottom: '1px solid #e2e8f0', padding: '6px 4px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700 }}>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.05"
                            value={row.puKg}
                            onChange={(e) => handleRowChange(idx, 'puKg', Number(e.target.value))}
                            style={{ width: '55px', border: '1px dashed #000', textAlign: 'center', padding: '2px' }}
                          />
                        ) : (
                          <span>{row.puKg ? row.puKg.toFixed(2) : ''}</span>
                        )}
                      </td>
                      <td style={{ borderBottom: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'right', fontSize: '0.92rem', fontWeight: 800 }}>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={row.montantHt}
                            onChange={(e) => handleRowChange(idx, 'montantHt', Number(e.target.value))}
                            style={{ width: '75px', border: '1px dashed #000', textAlign: 'right', padding: '2px' }}
                          />
                        ) : (
                          <span>{row.montantHt ? row.montantHt.toFixed(2) : ''}</span>
                        )}
                      </td>
                      {isEditing && (
                        <td className="no-print" style={{ borderLeft: '2px solid #000000', borderBottom: '1px solid #e2e8f0', padding: '4px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                            title="Supprimer la ligne"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}

                  {/* Empty placeholder rows to guarantee template format (at least 5 rows) */}
                  {Array.from({ length: emptyRowsNeeded }).map((_, i) => {
                    const rowNum = rows.length + i + 1;
                    return (
                      <tr key={`empty-${i}`} style={{ height: '36px' }}>
                        <td style={{ borderRight: '2px solid #000000', borderBottom: '1px solid #e2e8f0', padding: '6px 4px', textAlign: 'center', fontWeight: 900, fontSize: '0.92rem' }}>
                          {rowNum}
                        </td>
                        <td style={{ borderRight: '2px solid #000000', borderBottom: '1px solid #e2e8f0', padding: '6px 8px' }}></td>
                        <td style={{ borderRight: '2px solid #000000', borderBottom: '1px solid #e2e8f0', padding: '6px 4px' }}></td>
                        <td style={{ borderRight: '2px solid #000000', borderBottom: '1px solid #e2e8f0', padding: '6px 4px' }}></td>
                        <td style={{ borderRight: '2px solid #000000', borderBottom: '1px solid #e2e8f0', padding: '6px 4px' }}></td>
                        <td style={{ borderBottom: '1px solid #e2e8f0', padding: '6px 8px' }}></td>
                        {isEditing && <td className="no-print" style={{ borderLeft: '2px solid #000000', borderBottom: '1px solid #e2e8f0' }}></td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Box: TOTAL CAISSES, TOTAL HT, TOTAL TVA, TOTAL TTC */}
            <div className="invoice-totals-wrapper">
              <table>
                <thead>
                  <tr style={{ borderBottom: '2px solid #000000' }}>
                    <th style={{ borderRight: '2px solid #000000', padding: '7px 4px', textAlign: 'center', fontWeight: 900, width: '25%', fontSize: '0.9rem' }}>
                      TOTAL CAISSES
                    </th>
                    <th style={{ borderRight: '2px solid #000000', padding: '7px 4px', textAlign: 'center', fontWeight: 900, width: '25%', fontSize: '0.9rem' }}>
                      TOTAL HT
                    </th>
                    <th style={{ borderRight: '2px solid #000000', padding: '7px 4px', textAlign: 'center', fontWeight: 900, width: '25%', fontSize: '0.9rem' }}>
                      TOTAL TVA
                    </th>
                    <th style={{ padding: '7px 4px', textAlign: 'center', fontWeight: 900, width: '25%', fontSize: '0.9rem' }}>
                      TOTAL TTC
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ borderRight: '2px solid #000000', padding: '8px 4px', textAlign: 'center', fontWeight: 900, fontSize: '1.05rem' }}>
                      {totalCaisses}
                    </td>
                    <td style={{ borderRight: '2px solid #000000', padding: '8px 4px', textAlign: 'center', fontWeight: 900, fontSize: '1.05rem' }}>
                      {totalHT.toFixed(2)}
                    </td>
                    <td style={{ borderRight: '2px solid #000000', padding: '8px 4px', textAlign: 'center', fontWeight: 900, fontSize: '1.05rem' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={totalTva}
                          onChange={(e) => setTotalTva(Number(e.target.value))}
                          style={{ width: '70px', border: '1px dashed #000', textAlign: 'center', fontWeight: 900 }}
                        />
                      ) : (
                        <span>{totalTva.toFixed(2)}</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 900, fontSize: '1.1rem' }}>
                      {totalTTC.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Box: TYPES & REMISES (Bottom Right) */}
            <div className="invoice-remises-wrap">
              <table className="invoice-remises-table">
                <thead>
                  <tr style={{ borderBottom: '2px solid #000000' }}>
                    <th style={{ borderRight: '2px solid #000000', padding: '6px 10px', textAlign: 'center', fontWeight: 900, fontSize: '0.88rem', width: '50%' }}>
                      TYPES
                    </th>
                    <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 900, fontSize: '0.88rem', width: '50%' }}>
                      REMISES
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1.5px solid #000000' }}>
                    <td style={{ borderRight: '2px solid #000000', padding: '6px 10px', fontWeight: 700, fontSize: '0.88rem' }}>
                      Légumes
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, fontSize: '0.92rem' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={remiseLegumes}
                          onChange={(e) => setRemiseLegumes(Number(e.target.value))}
                          style={{ width: '65px', border: '1px dashed #000', textAlign: 'right', fontWeight: 800 }}
                        />
                      ) : (
                        <span>{remiseLegumes.toFixed(2)}</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ borderRight: '2px solid #000000', padding: '6px 10px', fontWeight: 700, fontSize: '0.88rem' }}>
                      V.gratuit
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, fontSize: '0.92rem' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={remiseGratuit}
                          onChange={(e) => setRemiseGratuit(Number(e.target.value))}
                          style={{ width: '65px', border: '1px dashed #000', textAlign: 'right', fontWeight: 800 }}
                        />
                      ) : (
                        <span>{remiseGratuit.toFixed(2)}</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
