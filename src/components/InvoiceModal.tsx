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
        style={{ maxWidth: '860px', width: '95%' }}
      >
        {/* Top Control Bar (Hidden when printing) */}
        <div className="invoice-controls no-print" style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ padding: '0.4rem', backgroundColor: '#166534', color: '#ffffff', borderRadius: '8px' }}>
              <FileText size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#166534', fontWeight: 800 }}>
                Facture Officielle Pont Agricole
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Modèle standardisé CHR • Données automatiquement pré-remplies et modifiables par l'administrateur
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Toggle Edit Mode */}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="btn btn-secondary"
              style={{
                fontSize: '0.82rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: isEditing ? '#fef3c7' : '#ffffff',
                borderColor: isEditing ? '#f59e0b' : 'var(--border-light)',
                color: isEditing ? '#92400e' : 'var(--primary-900)',
                fontWeight: 700,
              }}
            >
              {isEditing ? (
                <>
                  <Eye size={15} />
                  <span>Aperçu Document</span>
                </>
              ) : (
                <>
                  <Edit2 size={15} />
                  <span>Modifier la Facture</span>
                </>
              )}
            </button>

            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleSaveToOrder}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: '#166534',
                    fontSize: '0.82rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontWeight: 700,
                  }}
                >
                  <Save size={15} />
                  <span>Enregistrer</span>
                </button>
                <button
                  type="button"
                  onClick={initFromOrder}
                  className="btn btn-secondary"
                  title="Rétablir les données d'origine de la commande"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem', borderRadius: '8px' }}
                >
                  <RotateCcw size={15} />
                </button>
              </>
            )}

            <button
              onClick={handlePrint}
              className="btn btn-primary"
              style={{
                backgroundColor: '#000000',
                color: '#ffffff',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                fontWeight: 700,
              }}
            >
              <Printer size={15} />
              <span>Imprimer / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{
                fontSize: '0.82rem',
                padding: '0.45rem 0.65rem',
                borderRadius: '8px',
              }}
            >
              <X size={16} />
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
            }}
          >
            <span>
              ✍️ <strong>Mode Édition Activé :</strong> Vous pouvez modifier n'importe quel texte, quantité, prix ou ligne directement sur la facture.
            </span>
            <button
              type="button"
              onClick={handleAddRow}
              style={{
                border: '1px solid #d97706',
                backgroundColor: '#ffffff',
                color: '#b45309',
                borderRadius: '6px',
                padding: '0.2rem 0.6rem',
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

        {/* Printable Invoice Sheet (Matches user image exactly) */}
        <div
          id="invoice-printable-area"
          style={{
            backgroundColor: '#ffffff',
            color: '#000000',
            padding: '2rem 2.5rem',
            fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
            maxWidth: '780px',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          {/* Top Logo & Title */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <img
              src="/logo.png"
              alt="Pont Agricole"
              style={{ width: '85px', height: 'auto', margin: '0 auto 2px', display: 'block', objectFit: 'contain' }}
            />
            <div
              style={{
                fontSize: '2.3rem',
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 800,
              fontSize: '1rem',
              color: '#000000',
              marginBottom: '12px',
              padding: '0 2px',
            }}
          >
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
                    fontSize: '0.95rem',
                    padding: '2px 6px',
                    width: '120px',
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
                    fontSize: '0.95rem',
                    padding: '2px 6px',
                    width: '130px',
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
                    fontSize: '0.95rem',
                    padding: '2px 6px',
                    width: '120px',
                  }}
                />
              ) : (
                <span>{invoiceDate || '../../....'}</span>
              )}
            </div>
          </div>

          {/* Box: Facturé à */}
          <div
            style={{
              border: '2.5px solid #000000',
              padding: '10px 16px 14px',
              marginBottom: '14px',
              backgroundColor: '#ffffff',
            }}
          >
            <div
              style={{
                fontSize: '1.15rem',
                fontWeight: 900,
                color: '#000000',
                marginBottom: '8px',
                lineHeight: 1.2,
              }}
            >
              Facturé à
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '1.25rem',
                fontSize: '0.92rem',
                color: '#000000',
                lineHeight: 1.85,
              }}
            >
              {/* Left Column */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '4px' }}>
                  <strong style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Raison Sociale :</strong>
                  {isEditing ? (
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      style={{
                        border: '1px dashed #000',
                        fontSize: '0.88rem',
                        padding: '1px 4px',
                        width: '100%',
                        fontWeight: 700,
                      }}
                    />
                  ) : (
                    <span style={{ fontWeight: 700 }}>{businessName || '..............'}</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '4px' }}>
                  <strong style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Adresse :</strong>
                  {isEditing ? (
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      style={{
                        border: '1px dashed #000',
                        fontSize: '0.88rem',
                        padding: '1px 4px',
                        width: '100%',
                      }}
                    />
                  ) : (
                    <span>{deliveryAddress || '..............'}</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <strong style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Télephone :</strong>
                  {isEditing ? (
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      style={{
                        border: '1px dashed #000',
                        fontSize: '0.88rem',
                        padding: '1px 4px',
                        width: '100%',
                      }}
                    />
                  ) : (
                    <span>{customerPhone || '..............'}</span>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '4px' }}>
                  <strong style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Ice :</strong>
                  {isEditing ? (
                    <input
                      type="text"
                      value={customerIce}
                      onChange={(e) => setCustomerIce(e.target.value)}
                      style={{
                        border: '1px dashed #000',
                        fontSize: '0.88rem',
                        padding: '1px 4px',
                        width: '100%',
                      }}
                    />
                  ) : (
                    <span>{customerIce || '..............'}</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '4px' }}>
                  <strong style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>ville :</strong>
                  {isEditing ? (
                    <input
                      type="text"
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                      style={{
                        border: '1px dashed #000',
                        fontSize: '0.88rem',
                        padding: '1px 4px',
                        width: '100%',
                      }}
                    />
                  ) : (
                    <span>{deliveryCity || '..............'}</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <strong style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>code :</strong>
                  {isEditing ? (
                    <input
                      type="text"
                      value={customerCode}
                      onChange={(e) => setCustomerCode(e.target.value)}
                      style={{
                        border: '1px dashed #000',
                        fontSize: '0.88rem',
                        padding: '1px 4px',
                        width: '100%',
                      }}
                    />
                  ) : (
                    <span>{customerCode || '..............'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Table: Produce Items (#, Désignation, Caisses, Qté kg, Pu/KG, Montant HT) */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '2.5px solid #000000',
              marginBottom: '0px',
              backgroundColor: '#ffffff',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2.5px solid #000000' }}>
                <th style={{ border: '2.5px solid #000000', padding: '8px 4px', textAlign: 'center', width: '45px', fontWeight: 900, fontSize: '0.95rem' }}>
                  #
                </th>
                <th style={{ border: '2.5px solid #000000', padding: '8px 10px', textAlign: 'center', fontWeight: 900, fontSize: '0.95rem' }}>
                  Désignation
                </th>
                <th style={{ border: '2.5px solid #000000', padding: '8px 6px', textAlign: 'center', width: '85px', fontWeight: 900, fontSize: '0.95rem' }}>
                  Caisses
                </th>
                <th style={{ border: '2.5px solid #000000', padding: '8px 6px', textAlign: 'center', width: '90px', fontWeight: 900, fontSize: '0.95rem' }}>
                  Qté kg
                </th>
                <th style={{ border: '2.5px solid #000000', padding: '8px 6px', textAlign: 'center', width: '90px', fontWeight: 900, fontSize: '0.95rem' }}>
                  Pu/KG
                </th>
                <th style={{ border: '2.5px solid #000000', padding: '8px 8px', textAlign: 'center', width: '120px', fontWeight: 900, fontSize: '0.95rem' }}>
                  Montant HT
                </th>
                {isEditing && (
                  <th className="no-print" style={{ border: '2.5px solid #000000', padding: '8px 4px', width: '35px' }}></th>
                )}
              </tr>
            </thead>
            <tbody>
              {/* Active data rows */}
              {rows.map((row, idx) => (
                <tr key={row.id} style={{ height: '38px' }}>
                  <td style={{ border: '2.5px solid #000000', padding: '6px 4px', textAlign: 'center', fontWeight: 900, fontSize: '0.95rem' }}>
                    {idx + 1}
                  </td>
                  <td style={{ border: '2.5px solid #000000', padding: '6px 10px', fontSize: '0.92rem' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.designation}
                        onChange={(e) => handleRowChange(idx, 'designation', e.target.value)}
                        style={{ width: '100%', border: '1px dashed #000', padding: '2px 4px', fontSize: '0.9rem' }}
                      />
                    ) : (
                      <span>{row.designation}</span>
                    )}
                  </td>
                  <td style={{ border: '2.5px solid #000000', padding: '6px', textAlign: 'center', fontSize: '0.92rem', fontWeight: 700 }}>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={row.caisses}
                        onChange={(e) => handleRowChange(idx, 'caisses', Number(e.target.value))}
                        style={{ width: '60px', border: '1px dashed #000', textAlign: 'center', padding: '2px' }}
                      />
                    ) : (
                      <span>{row.caisses || ''}</span>
                    )}
                  </td>
                  <td style={{ border: '2.5px solid #000000', padding: '6px', textAlign: 'center', fontSize: '0.92rem', fontWeight: 700 }}>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={row.qteKg}
                        onChange={(e) => handleRowChange(idx, 'qteKg', Number(e.target.value))}
                        style={{ width: '65px', border: '1px dashed #000', textAlign: 'center', padding: '2px' }}
                      />
                    ) : (
                      <span>{row.qteKg ? row.qteKg.toFixed(1) : ''}</span>
                    )}
                  </td>
                  <td style={{ border: '2.5px solid #000000', padding: '6px', textAlign: 'center', fontSize: '0.92rem', fontWeight: 700 }}>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.05"
                        value={row.puKg}
                        onChange={(e) => handleRowChange(idx, 'puKg', Number(e.target.value))}
                        style={{ width: '65px', border: '1px dashed #000', textAlign: 'center', padding: '2px' }}
                      />
                    ) : (
                      <span>{row.puKg ? row.puKg.toFixed(2) : ''}</span>
                    )}
                  </td>
                  <td style={{ border: '2.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontSize: '0.95rem', fontWeight: 800 }}>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        value={row.montantHt}
                        onChange={(e) => handleRowChange(idx, 'montantHt', Number(e.target.value))}
                        style={{ width: '90px', border: '1px dashed #000', textAlign: 'right', padding: '2px' }}
                      />
                    ) : (
                      <span>{row.montantHt ? row.montantHt.toFixed(2) : ''}</span>
                    )}
                  </td>
                  {isEditing && (
                    <td className="no-print" style={{ border: '2.5px solid #000000', padding: '4px', textAlign: 'center' }}>
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
                  <tr key={`empty-${i}`} style={{ height: '38px' }}>
                    <td style={{ border: '2.5px solid #000000', padding: '6px 4px', textAlign: 'center', fontWeight: 900, fontSize: '0.95rem' }}>
                      {rowNum}
                    </td>
                    <td style={{ border: '2.5px solid #000000', padding: '6px 10px' }}></td>
                    <td style={{ border: '2.5px solid #000000', padding: '6px' }}></td>
                    <td style={{ border: '2.5px solid #000000', padding: '6px' }}></td>
                    <td style={{ border: '2.5px solid #000000', padding: '6px' }}></td>
                    <td style={{ border: '2.5px solid #000000', padding: '6px 8px' }}></td>
                    {isEditing && <td className="no-print" style={{ border: '2.5px solid #000000' }}></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Box: TOTAL CAISSES, TOTAL HT, TOTAL TVA, TOTAL TTC */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '2.5px solid #000000',
              borderTop: 'none',
              marginBottom: '10px',
              backgroundColor: '#ffffff',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2.5px solid #000000' }}>
                <th style={{ border: '2.5px solid #000000', padding: '8px 4px', textAlign: 'center', fontWeight: 900, width: '25%', fontSize: '0.92rem' }}>
                  TOTAL CAISSES
                </th>
                <th style={{ border: '2.5px solid #000000', padding: '8px 4px', textAlign: 'center', fontWeight: 900, width: '25%', fontSize: '0.92rem' }}>
                  TOTAL HT
                </th>
                <th style={{ border: '2.5px solid #000000', padding: '8px 4px', textAlign: 'center', fontWeight: 900, width: '25%', fontSize: '0.92rem' }}>
                  TOTAL TVA
                </th>
                <th style={{ border: '2.5px solid #000000', padding: '8px 4px', textAlign: 'center', fontWeight: 900, width: '25%', fontSize: '0.92rem' }}>
                  TOTAL TTC
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '2.5px solid #000000', padding: '8px 4px', textAlign: 'center', fontWeight: 900, fontSize: '1.1rem' }}>
                  {totalCaisses}
                </td>
                <td style={{ border: '2.5px solid #000000', padding: '8px 4px', textAlign: 'center', fontWeight: 900, fontSize: '1.1rem' }}>
                  {totalHT.toFixed(2)}
                </td>
                <td style={{ border: '2.5px solid #000000', padding: '8px 4px', textAlign: 'center', fontWeight: 900, fontSize: '1.1rem' }}>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={totalTva}
                      onChange={(e) => setTotalTva(Number(e.target.value))}
                      style={{ width: '80px', border: '1px dashed #000', textAlign: 'center', fontWeight: 900 }}
                    />
                  ) : (
                    <span>{totalTva.toFixed(2)}</span>
                  )}
                </td>
                <td style={{ border: '2.5px solid #000000', padding: '8px 4px', textAlign: 'center', fontWeight: 900, fontSize: '1.15rem' }}>
                  {totalTTC.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Box: TYPES & REMISES (Bottom Right) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <table
              style={{
                width: '270px',
                borderCollapse: 'collapse',
                border: '2.5px solid #000000',
                backgroundColor: '#ffffff',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2.5px solid #000000' }}>
                  <th style={{ border: '2.5px solid #000000', padding: '6px 12px', textAlign: 'center', fontWeight: 900, fontSize: '0.9rem', width: '50%' }}>
                    TYPES
                  </th>
                  <th style={{ border: '2.5px solid #000000', padding: '6px 12px', textAlign: 'center', fontWeight: 900, fontSize: '0.9rem', width: '50%' }}>
                    REMISES
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '2px solid #000000' }}>
                  <td style={{ border: '2.5px solid #000000', padding: '6px 12px', fontWeight: 700, fontSize: '0.9rem' }}>
                    Légumes
                  </td>
                  <td style={{ border: '2.5px solid #000000', padding: '6px 12px', textAlign: 'right', fontWeight: 800, fontSize: '0.95rem' }}>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={remiseLegumes}
                        onChange={(e) => setRemiseLegumes(Number(e.target.value))}
                        style={{ width: '70px', border: '1px dashed #000', textAlign: 'right', fontWeight: 800 }}
                      />
                    ) : (
                      <span>{remiseLegumes.toFixed(2)}</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: '2.5px solid #000000', padding: '6px 12px', fontWeight: 700, fontSize: '0.9rem' }}>
                    V.gratuit
                  </td>
                  <td style={{ border: '2.5px solid #000000', padding: '6px 12px', textAlign: 'right', fontWeight: 800, fontSize: '0.95rem' }}>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={remiseGratuit}
                        onChange={(e) => setRemiseGratuit(Number(e.target.value))}
                        style={{ width: '70px', border: '1px dashed #000', textAlign: 'right', fontWeight: 800 }}
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
  );
};
