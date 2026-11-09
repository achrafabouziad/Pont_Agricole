import React, { useState, useEffect, useRef } from 'react';
import { Order, CompanySettings, Business } from '../types';
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
  Layers,
} from 'lucide-react';
import { store, generateUUID } from '../services/store';

export interface InvoiceModalProps {
  order?: Order | null;
  orders?: Order[] | null;
  onClose: () => void;
  settings?: CompanySettings | null;
  clientBusiness?: Business | null;
  initialMode?: 'global' | 'single';
}

export interface InvoiceRowItem {
  id: string;
  designation: string;
  caisses: number;
  qteKg: number;
  puKg: number;
  montantHt: number;
  unit?: string;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  order,
  orders,
  onClose,
  settings: propsSettings,
  clientBusiness,
  initialMode,
}) => {
  // Determine all available orders for this client
  const allOrders: Order[] = orders && orders.length > 0
    ? orders
    : (order ? [order] : []);

  const [invoiceMode, setInvoiceMode] = useState<'global' | 'single'>(
    initialMode || (allOrders.length > 1 ? 'global' : 'single')
  );
  const [selectedSingleId, setSelectedSingleId] = useState<string>(
    order?.id || allOrders[0]?.id || ''
  );
  const [viewGrouping, setViewGrouping] = useState<'consolidated' | 'detailed'>('consolidated');

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

  // User modification tracking refs
  const hasUserEditedRef = useRef<boolean>(false);
  const lastInitializedKeyRef = useRef<string | null>(null);

  // Active orders based on selected mode
  const activeOrders: Order[] = invoiceMode === 'single'
    ? (allOrders.filter((o) => o.id === selectedSingleId).length > 0
        ? allOrders.filter((o) => o.id === selectedSingleId)
        : [allOrders[0]])
    : allOrders;

  // Initialize and auto-populate all fields from active orders
  const initInvoice = (forceReset = false) => {
    if (activeOrders.length === 0) return;
    const baseOrd = activeOrders[0];

    const storageKey =
      activeOrders.length === 1
        ? `pont_invoice_custom_${baseOrd.id}`
        : `pont_global_invoice_${activeOrders.map((o) => o.id).join('_')}`;

    // Si des modifications personnalisées ont été sauvegardées et qu'on ne force pas le reset
    if (!forceReset) {
      try {
        const savedRaw = localStorage.getItem(storageKey);
        if (savedRaw) {
          const s = JSON.parse(savedRaw);
          if (s && s.rows && Array.isArray(s.rows) && s.rows.length > 0) {
            setInvoiceNumber(s.invoiceNumber || '');
            if (s.invoicePhone) setInvoicePhone(s.invoicePhone);
            setInvoiceDate(s.invoiceDate || '');
            setBusinessName(s.businessName || '');
            setDeliveryAddress(s.deliveryAddress || '');
            setCustomerPhone(s.customerPhone || '');
            setCustomerIce(s.customerIce || '');
            setDeliveryCity(s.deliveryCity || 'Casablanca');
            setCustomerCode(s.customerCode || '');
            setRows(s.rows);
            setRemiseLegumes(Number(s.remiseLegumes) || 0);
            setRemiseGratuit(Number(s.remiseGratuit) || 0);
            setTotalTva(Number(s.totalTva) || 0);
            return;
          }
        }
      } catch {}
    }

    if (!propsSettings) {
      store.getCompanySettings().then((st) => {
        setLiveSettings(st);
        if (st.phone) setInvoicePhone(st.phone);
      });
    } else {
      setLiveSettings(propsSettings);
      if (propsSettings.phone) setInvoicePhone(propsSettings.phone);
    }

    // Auto lookup business ICE if not passed
    if (clientBusiness?.ice) {
      setCustomerIce(clientBusiness.ice);
    } else {
      store.getBusinesses().then((bizList) => {
        const match = bizList.find(
          (b) => b.id === baseOrd.businessId || b.ownerId === baseOrd.customerId || b.phone === baseOrd.customerPhone
        );
        if (match?.ice) {
          setCustomerIce(match.ice);
        }
      });
    }

    const clientCode = baseOrd.customerId ? baseOrd.customerId.slice(-4).toUpperCase() : '001';
    const nowIso = new Date().toISOString();
    const todayFormatted = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    if (activeOrders.length > 1) {
      setInvoiceNumber(`REC-${clientCode}-${nowIso.slice(2, 7).replace('-', '')}`);
      setInvoiceDate(todayFormatted);
    } else {
      const num = baseOrd.orderNumber.replace('#', '').replace(/^PA-/, '');
      setInvoiceNumber(num || '001');
      const formattedDate = baseOrd.requestedDeliveryDate
        ? baseOrd.requestedDeliveryDate
        : new Date(baseOrd.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
      setInvoiceDate(formattedDate);
    }

    setBusinessName(clientBusiness?.businessName || baseOrd.businessName || baseOrd.customerName || '');
    setDeliveryAddress(clientBusiness?.deliveryAddress || baseOrd.deliveryAddress || '');
    setCustomerPhone(clientBusiness?.phone || baseOrd.customerPhone || '');
    if (clientBusiness?.ice) setCustomerIce(clientBusiness.ice);
    else if (baseOrd.customerIce) setCustomerIce(baseOrd.customerIce);
    setDeliveryCity(clientBusiness?.city || baseOrd.deliveryCity || 'Casablanca');
    setCustomerCode(clientCode ? `CLT-${clientCode}` : 'CLT-01');

    // Auto-map produce items
    if (activeOrders.length > 1 && viewGrouping === 'consolidated') {
      const productMap = new Map<string, InvoiceRowItem>();
      activeOrders.forEach((ord) => {
        (ord.items || []).forEach((item, idx) => {
          const key = (item.productId || item.productNameSnapshot || `item-${idx}`).trim().toLowerCase();
          const isCaisse = item.unitSnapshot === 'caisse' || item.unitSnapshot === 'carton';
          const caissesCount = isCaisse ? item.quantity : 1;
          const qte = item.unitSnapshot === 'kg' ? item.quantity : item.quantity * 10;
          const lineTot = item.lineTotal || (item.unitPriceSnapshot * item.quantity);

          if (productMap.has(key)) {
            const cur = productMap.get(key)!;
            cur.caisses += caissesCount;
            cur.qteKg += qte;
            cur.montantHt = Math.round((cur.montantHt + lineTot) * 100) / 100;
          } else {
            productMap.set(key, {
              id: item.productId || `prod-${key}`,
              designation: item.productNameSnapshot || '',
              caisses: caissesCount,
              qteKg: qte,
              puKg: item.unitPriceSnapshot || 0,
              montantHt: Math.round(lineTot * 100) / 100,
              unit: item.unitSnapshot || (isCaisse ? 'caisse' : 'kg'),
            });
          }
        });
      });
      setRows(Array.from(productMap.values()));
    } else {
      const mappedRows: InvoiceRowItem[] = [];
      activeOrders.forEach((ord) => {
        const ordRef = ord.orderNumber ? ord.orderNumber.replace('#', '').slice(-8) : '';
        const nameSuffix = activeOrders.length > 1 ? ` (Cde ${ordRef})` : '';
        (ord.items || []).forEach((item, idx) => {
          const isCaisse = item.unitSnapshot === 'caisse' || item.unitSnapshot === 'carton';
          const caissesCount = isCaisse ? item.quantity : 1;
          const qte = item.unitSnapshot === 'kg' ? item.quantity : item.quantity * 10;
          mappedRows.push({
            id: `${ord.id}-${item.productId || idx}`,
            designation: `${item.productNameSnapshot}${nameSuffix}`,
            caisses: caissesCount,
            qteKg: qte,
            puKg: item.unitPriceSnapshot || 0,
            montantHt: item.lineTotal || 0,
            unit: item.unitSnapshot || (isCaisse ? 'caisse' : 'kg'),
          });
        });
      });
      setRows(mappedRows);
    }

    setRemiseLegumes(0);
    setRemiseGratuit(0);
    setTotalTva(0);
  };

  useEffect(() => {
    const currentKey = `${invoiceMode}_${selectedSingleId}_${viewGrouping}_${allOrders.map((o) => o.id).join(',')}`;
    // Si l'utilisateur est en train de modifier CETTE facture ou l'a déjà modifiée, NE JAMAIS l'écraser automatiquement !
    if (lastInitializedKeyRef.current === currentKey && (isEditing || hasUserEditedRef.current)) {
      return;
    }
    lastInitializedKeyRef.current = currentKey;
    hasUserEditedRef.current = false;
    initInvoice(false);
  }, [allOrders.map((o) => o.id).join(','), invoiceMode, selectedSingleId, viewGrouping]);

  if (allOrders.length === 0) return null;

  const handlePrint = () => {
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

  // Date range for multi-order invoices
  const dates = activeOrders.map((o) => o.requestedDeliveryDate || o.createdAt).filter(Boolean);
  dates.sort();
  const earliestDate = dates[0]
    ? dates[0].includes('T')
      ? new Date(dates[0]).toLocaleDateString('fr-FR')
      : dates[0]
    : '';
  const latestDate = dates[dates.length - 1]
    ? dates[dates.length - 1].includes('T')
      ? new Date(dates[dates.length - 1]).toLocaleDateString('fr-FR')
      : dates[dates.length - 1]
    : '';

  // Row update handlers
  const handleRowChange = (index: number, field: keyof InvoiceRowItem, val: any) => {
    hasUserEditedRef.current = true;
    setRows((prev) => {
      const next = [...prev];
      const cur = { ...next[index], [field]: val };
      if (field === 'qteKg' || field === 'puKg') {
        const qte = field === 'qteKg' ? Number(val) || 0 : Number(cur.qteKg) || 0;
        const pu = field === 'puKg' ? Number(val) || 0 : Number(cur.puKg) || 0;
        cur.montantHt = Math.round(qte * pu * 100) / 100;
      } else if (field === 'montantHt') {
        cur.montantHt = Number(val) || 0;
      }
      next[index] = cur;
      return next;
    });
  };

  const handleAddRow = () => {
    hasUserEditedRef.current = true;
    setRows((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        designation: '',
        caisses: 1,
        qteKg: 10,
        puKg: 0,
        montantHt: 0,
        unit: 'kg',
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    hasUserEditedRef.current = true;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveToOrder = async () => {
    if (activeOrders.length === 0) return;
    try {
      hasUserEditedRef.current = true;
      const baseOrd = activeOrders[0];
      const storageKey =
        activeOrders.length === 1
          ? `pont_invoice_custom_${baseOrd.id}`
          : `pont_global_invoice_${activeOrders.map((o) => o.id).join('_')}`;

      const snapshot = {
        invoiceNumber,
        invoicePhone,
        invoiceDate,
        businessName,
        deliveryAddress,
        customerPhone,
        customerIce,
        deliveryCity,
        customerCode,
        rows,
        totalHT,
        totalTTC,
        totalTva,
        remiseLegumes,
        remiseGratuit,
        updatedAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
      } catch {}

      if (activeOrders.length === 1) {
        const targetOrd = activeOrders[0];
        const updatedOrder: Order = {
          ...targetOrd,
          customerName: businessName || targetOrd.customerName,
          businessName: businessName || targetOrd.businessName,
          deliveryAddress: deliveryAddress || targetOrd.deliveryAddress,
          customerPhone: customerPhone || targetOrd.customerPhone,
          deliveryCity: deliveryCity || targetOrd.deliveryCity,
          customerIce: customerIce || targetOrd.customerIce,
          subtotal: totalHT,
          total: totalTTC,
          items: rows.map((r, rIdx) => {
            const isPerKg = (r.qteKg > 0 && Math.abs((r.qteKg * r.puKg) - r.montantHt) < 0.1) || r.unit === 'kg';
            const qty = isPerKg ? (r.qteKg || r.caisses || 1) : (r.caisses || r.qteKg || 1);
            const unit = isPerKg ? 'kg' : (r.unit || 'caisse');
            return {
              id: r.id.startsWith('custom-') ? generateUUID() : r.id,
              orderId: targetOrd.id,
              productId: r.id.startsWith('custom-') ? generateUUID() : r.id,
              productNameSnapshot: r.designation || `Article ${rIdx + 1}`,
              unitSnapshot: unit,
              unitPriceSnapshot: Number(r.puKg) || 0,
              quantity: Number(qty) || 1,
              lineTotal: Number(r.montantHt) || 0,
            };
          }),
        };
        await store.updateOrder(updatedOrder);
        setSavingNotice('Facture de commande modifiée et enregistrée avec succès !');
      } else {
        setSavingNotice('Facture globale récapitulative enregistrée avec succès !');
      }
      setTimeout(() => setSavingNotice(null), 3500);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving invoice changes', err);
    }
  };

  // Pad rows up to minimum 5 rows matching the template design
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
                <h3 className="invoice-header-title">
                  {activeOrders.length > 1
                    ? `Facture Globale Récapitulative (${activeOrders.length} Commandes)`
                    : 'Facture Officielle Pont Agricole'}
                </h3>
                <p className="invoice-header-subtitle">
                  Facture #{invoiceNumber || '---'} • {invoiceDate}
                  {activeOrders.length > 1 && ` • ${businessName || 'Client'}`}
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

          {/* Mode Switcher when multiple orders exist */}
          {allOrders.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                paddingTop: '0.45rem',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setInvoiceMode('global')}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: '1.5px solid',
                    backgroundColor: invoiceMode === 'global' ? '#166534' : '#ffffff',
                    color: invoiceMode === 'global' ? '#ffffff' : '#166534',
                    borderColor: '#166534',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: invoiceMode === 'global' ? '0 2px 6px rgba(22, 101, 52, 0.2)' : 'none',
                  }}
                >
                  <FileText size={13} />
                  <span>Facture Globale ({allOrders.length} Commandes)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInvoiceMode('single')}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: '1.5px solid',
                    backgroundColor: invoiceMode === 'single' ? '#166534' : '#ffffff',
                    color: invoiceMode === 'single' ? '#ffffff' : '#166534',
                    borderColor: '#166534',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: invoiceMode === 'single' ? '0 2px 6px rgba(22, 101, 52, 0.2)' : 'none',
                  }}
                >
                  <span>Par Commande Seule</span>
                </button>

                {invoiceMode === 'single' && (
                  <select
                    value={selectedSingleId}
                    onChange={(e) => setSelectedSingleId(e.target.value)}
                    style={{
                      padding: '0.28rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      border: '1px solid #cbd5e1',
                      fontWeight: 700,
                      color: '#1e293b',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {allOrders.map((ord) => (
                      <option key={ord.id} value={ord.id}>
                        {ord.orderNumber} ({new Date(ord.createdAt).toLocaleDateString('fr-FR')} - {ord.total.toFixed(2)} DH)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {invoiceMode === 'global' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Affichage :</span>
                  <button
                    type="button"
                    onClick={() => setViewGrouping(viewGrouping === 'consolidated' ? 'detailed' : 'consolidated')}
                    style={{
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      borderRadius: '6px',
                      padding: '0.22rem 0.55rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                    title="Changer entre produits groupés ou détail par commande"
                  >
                    <Layers size={12} />
                    <span>{viewGrouping === 'consolidated' ? 'Groupé par produit' : 'Détaillé par date'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

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
                  onClick={() => {
                    const baseOrd = activeOrders[0];
                    if (baseOrd) {
                      const storageKey =
                        activeOrders.length === 1
                          ? `pont_invoice_custom_${baseOrd.id}`
                          : `pont_global_invoice_${activeOrders.map((o) => o.id).join('_')}`;
                      try {
                        localStorage.removeItem(storageKey);
                      } catch {}
                    }
                    hasUserEditedRef.current = false;
                    initInvoice(true);
                    setSavingNotice("Données d'origine rétablies.");
                    setTimeout(() => setSavingNotice(null), 2500);
                  }}
                  className="invoice-action-btn"
                  title="Rétablir les données d'origine"
                >
                  <RotateCcw size={14} />
                  <span>Réinitialiser</span>
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
                {activeOrders.length > 1 ? 'Facture Récapitulative' : 'Facture'}
              </div>
              {activeOrders.length > 1 && (
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', marginTop: '3px' }}>
                  Facture Globale regroupant {activeOrders.length} commandes{earliestDate && latestDate ? ` • Période du ${earliestDate} au ${latestDate}` : ''}
                </div>
              )}
            </div>

            {/* Subheader Row: N°, TEL, DATE */}
            <div className="invoice-subhead-row">
              <div>
                <strong>N°: </strong>
                {isEditing ? (
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => {
                      hasUserEditedRef.current = true;
                      setInvoiceNumber(e.target.value);
                    }}
                    style={{
                      border: '1px dashed #000',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      padding: '2px 4px',
                      width: '135px',
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
                    onChange={(e) => {
                      hasUserEditedRef.current = true;
                      setInvoicePhone(e.target.value);
                    }}
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
                    onChange={(e) => {
                      hasUserEditedRef.current = true;
                      setInvoiceDate(e.target.value);
                    }}
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
                        onChange={(e) => {
                          hasUserEditedRef.current = true;
                          setBusinessName(e.target.value);
                        }}
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
                        onChange={(e) => {
                          hasUserEditedRef.current = true;
                          setDeliveryAddress(e.target.value);
                        }}
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
                        onChange={(e) => {
                          hasUserEditedRef.current = true;
                          setCustomerPhone(e.target.value);
                        }}
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
                        onChange={(e) => {
                          hasUserEditedRef.current = true;
                          setCustomerIce(e.target.value);
                        }}
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
                        onChange={(e) => {
                          hasUserEditedRef.current = true;
                          setDeliveryCity(e.target.value);
                        }}
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
                        onChange={(e) => {
                          hasUserEditedRef.current = true;
                          setCustomerCode(e.target.value);
                        }}
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
                          onChange={(e) => {
                            hasUserEditedRef.current = true;
                            setTotalTva(Number(e.target.value) || 0);
                          }}
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
                          onChange={(e) => {
                            hasUserEditedRef.current = true;
                            setRemiseLegumes(Number(e.target.value) || 0);
                          }}
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
                          onChange={(e) => {
                            hasUserEditedRef.current = true;
                            setRemiseGratuit(Number(e.target.value) || 0);
                          }}
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

            {/* Multi-orders manifest notice on paper */}
            {activeOrders.length > 1 && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '6px 10px',
                  border: '1px dashed #000000',
                  borderRadius: '4px',
                  fontSize: '0.74rem',
                  color: '#000000',
                  backgroundColor: '#ffffff',
                }}
              >
                <strong>Bordereau des {activeOrders.length} commandes incluses dans cette facture : </strong>
                {activeOrders.map((o) => `${o.orderNumber} (${o.total.toFixed(2)} DH)`).join(' • ')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
