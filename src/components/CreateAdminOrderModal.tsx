import React, { useState, useEffect, useMemo } from 'react';
import {
  Business,
  Product,
  Order,
  OrderStatus,
  ProductUnit,
  CreateManualOrderItem,
} from '../types';
import { store } from '../services/store';
import {
  X,
  Plus,
  Trash2,
  Search,
  ShoppingCart,
  Building2,
  Phone,
  MapPin,
  Calendar,
  FileText,
  User,
  CheckCircle,
  AlertCircle,
  Printer,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface CreateAdminOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: Business[];
  products: Product[];
  initialClient?: Business | null;
  onOrderCreated: (order: Order) => void;
}

interface SelectedItemRow {
  productId: string;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
}

const MOROCCAN_CITIES = [
  'Casablanca',
  'Rabat - Salé',
  'Marrakech',
  'Tanger',
  'Agadir',
  'Fès - Meknès',
  'Mohammedia',
  'Kénitra',
  'El Jadida',
  'Autre',
];

export const CreateAdminOrderModal: React.FC<CreateAdminOrderModalProps> = ({
  isOpen,
  onClose,
  businesses,
  products,
  initialClient,
  onOrderCreated,
}) => {
  // Mode client : 'registered' (Sélection d'un compte) ou 'direct' (Client direct / par téléphone)
  const [clientMode, setClientMode] = useState<'registered' | 'direct'>('registered');
  const [selectedBizId, setSelectedBizId] = useState<string>('');

  // Champs client
  const [customerName, setCustomerName] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerUsername, setCustomerUsername] = useState<string>('');
  const [customerIce, setCustomerIce] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryCity, setDeliveryCity] = useState<string>('Casablanca');

  // Détails commande
  const tomorrowStr = useMemo(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().slice(0, 10);
  }, []);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState<string>(tomorrowStr);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('confirmed');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  // Articles sélectionnés
  const [items, setItems] = useState<SelectedItemRow[]>([]);

  // Recherche produit pour ajout rapide
  const [productSearch, setProductSearch] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [inputQuantity, setInputQuantity] = useState<number>(10);
  const [inputCustomPrice, setInputCustomPrice] = useState<string>('');

  // État soumission
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clients filtrés disponibles (non rejetés)
  const availableBusinesses = useMemo(() => {
    return businesses
      .filter((b) => b.approvalStatus !== 'rejected')
      .sort((a, b) => (a.businessName || '').localeCompare(b.businessName || ''));
  }, [businesses]);

  // Initialisation à l'ouverture ou au changement d'initialClient
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setIsSubmitting(false);

    if (initialClient) {
      setClientMode('registered');
      setSelectedBizId(initialClient.id);
      applyBusinessData(initialClient);
    } else if (availableBusinesses.length > 0 && !selectedBizId) {
      setClientMode('registered');
      setSelectedBizId(availableBusinesses[0].id);
      applyBusinessData(availableBusinesses[0]);
    }
  }, [isOpen, initialClient, availableBusinesses]);

  const applyBusinessData = (biz: Business) => {
    setCustomerName(biz.contactName || biz.businessName);
    setBusinessName(biz.businessName);
    setCustomerPhone(biz.phone || '');
    setCustomerUsername(biz.username || '');
    setCustomerIce(biz.ice || '');
    setDeliveryAddress(biz.deliveryAddress || '');
    setDeliveryCity(biz.city || 'Casablanca');
  };

  const handleSelectBusiness = (bizId: string) => {
    setSelectedBizId(bizId);
    const biz = businesses.find((b) => b.id === bizId);
    if (biz) {
      applyBusinessData(biz);
    }
  };

  // Switch to direct mode
  const handleSwitchToDirect = () => {
    setClientMode('direct');
    setSelectedBizId('');
    setCustomerName('');
    setBusinessName('');
    setCustomerPhone('');
    setCustomerUsername('');
    setCustomerIce('');
    setDeliveryAddress('');
    setDeliveryCity('Casablanca');
  };

  // Switch to registered mode
  const handleSwitchToRegistered = () => {
    setClientMode('registered');
    if (availableBusinesses.length > 0) {
      const b = availableBusinesses[0];
      setSelectedBizId(b.id);
      applyBusinessData(b);
    }
  };

  // Produits filtrés pour la recherche
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  // Produit actif sélectionné pour le champ d'ajout
  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Quand le produit sélectionné change, initialiser son prix
  useEffect(() => {
    if (activeProduct) {
      setInputCustomPrice(String(activeProduct.price));
    }
  }, [activeProduct]);

  // Ajouter un produit à la commande
  const handleAddItem = (prod: Product, qte?: number, priceOverride?: number) => {
    const quantity = qte !== undefined ? qte : Math.max(1, Number(inputQuantity) || 1);
    const unitPrice =
      priceOverride !== undefined
        ? priceOverride
        : inputCustomPrice !== ''
        ? Math.max(0, Number(inputCustomPrice) || 0)
        : prod.price;

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === prod.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        updated[existingIdx].unitPrice = unitPrice;
        return updated;
      }
      return [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          unit: prod.unit,
          unitPrice,
          quantity,
          imageUrl: prod.imageUrl,
        },
      ];
    });

    // Reset picker
    setSelectedProductId('');
    setInputCustomPrice('');
    setInputQuantity(10);
    setProductSearch('');
  };

  // Mettre à jour la quantité d'un article
  const handleUpdateQuantity = (idx: number, delta: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const cur = updated[idx];
      const newQty = Math.max(0.5, Math.round((cur.quantity + delta) * 10) / 10);
      updated[idx] = { ...cur, quantity: newQty };
      return updated;
    });
  };

  // Saisie directe de quantité
  const handleSetQuantityDirect = (idx: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], quantity: Math.max(0.1, num) };
      return updated;
    });
  };

  // Mettre à jour le prix négocié / remisé d'un article
  const handleUpdatePrice = (idx: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], unitPrice: Math.max(0, num) };
      return updated;
    });
  };

  // Supprimer un article
  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Calcul des totaux
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);
  }, [items]);

  const total = useMemo(() => {
    return subtotal + (Number(deliveryFee) || 0);
  }, [subtotal, deliveryFee]);

  // Soumission & Enregistrement de la commande
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (items.length === 0) {
      setErrorMsg('Veuillez ajouter au moins un produit à la commande.');
      return;
    }

    if (!customerName.trim() && !businessName.trim()) {
      setErrorMsg("Veuillez renseigner le nom du client ou de l'établissement.");
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMsg('Veuillez renseigner le numéro de téléphone pour le suivi de la commande.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderItems: CreateManualOrderItem[] = items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        unit: it.unit,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
      }));

      const res = await store.createManualOrder({
        businessId: clientMode === 'registered' ? selectedBizId : undefined,
        businessName: businessName.trim() || customerName.trim(),
        customerName: customerName.trim() || businessName.trim(),
        customerPhone: customerPhone.trim(),
        customerUsername: customerUsername.trim() || undefined,
        customerIce: customerIce.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || 'Adresse convenue par téléphone',
        deliveryCity: deliveryCity.trim() || 'Casablanca',
        requestedDeliveryDate,
        status: orderStatus,
        customerNotes: customerNotes.trim() || undefined,
        deliveryFee: Number(deliveryFee) || 0,
        items: orderItems,
      });

      if (res.success && res.order) {
        // Notifier le parent (AdminDashboardPage) qui ouvrira immédiatement InvoiceModal
        onOrderCreated(res.order);
        onClose();
      } else {
        setErrorMsg(res.error || 'Erreur lors de la création de la commande.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la création de la commande.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'fadeInModal 0.2s ease-out',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                <span>Nouvelle Commande Client & Facture</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.2rem 0.55rem',
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    borderRadius: '20px',
                    fontWeight: 700,
                  }}
                >
                  Admin B2B
                </span>
              </h2>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Créez une commande pour un client indisponible ou par téléphone, et ouvrez immédiatement sa Facture commerciale.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#64748b',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                color: '#b91c1c',
                fontSize: '0.88rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* SECTION 1: SÉLECTION DU CLIENT */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} style={{ color: '#166534' }} />
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                  1. Identification du Client
                </strong>
              </div>

              {/* Mode Toggle Buttons */}
              <div
                style={{
                  display: 'inline-flex',
                  backgroundColor: '#f1f5f9',
                  padding: '3px',
                  borderRadius: '10px',
                  gap: '4px',
                }}
              >
                <button
                  type="button"
                  onClick={handleSwitchToRegistered}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: clientMode === 'registered' ? 700 : 500,
                    backgroundColor: clientMode === 'registered' ? '#ffffff' : 'transparent',
                    color: clientMode === 'registered' ? '#166534' : '#64748b',
                    boxShadow: clientMode === 'registered' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  Client Inscrit ({availableBusinesses.length})
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToDirect}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: clientMode === 'direct' ? 700 : 500,
                    backgroundColor: clientMode === 'direct' ? '#ffffff' : 'transparent',
                    color: clientMode === 'direct' ? '#166534' : '#64748b',
                    boxShadow: clientMode === 'direct' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  + Nouveau Client / Téléphone
                </button>
              </div>
            </div>

            {/* Mode Client Inscrit */}
            {clientMode === 'registered' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Choisir l'établissement parmi les clients inscrits :
                </label>
                <select
                  value={selectedBizId}
                  onChange={(e) => handleSelectBusiness(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    marginBottom: '0.85rem',
                  }}
                >
                  <option value="">-- Sélectionnez un client --</option>
                  {availableBusinesses.map((biz) => (
                    <option key={biz.id} value={biz.id}>
                      {biz.businessName} • {biz.contactName || 'Sans contact'} ({biz.phone || 'Pas de tél'}) - {biz.city || 'Casa'}
                    </option>
                  ))}
                </select>

                {/* Carte récapitulative du client sélectionné */}
                {selectedBizId && (
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.65rem',
                      fontSize: '0.83rem',
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748b' }}>Établissement : </span>
                      <strong style={{ color: '#166534' }}>{businessName}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Responsable : </span>
                      <strong style={{ color: '#0f172a' }}>{customerName}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Téléphone : </span>
                      <strong style={{ color: '#0f172a' }}>{customerPhone}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Ville & Adresse : </span>
                      <strong style={{ color: '#0f172a' }}>{deliveryCity} ({deliveryAddress || 'Non spécifiée'})</strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mode Client Direct / Téléphone */}
            {clientMode === 'direct' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Nom de l'établissement / Restaurant *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Restaurant Marina, Café Atlas..."
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Nom du Contact / Responsable *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Karim, Chef Omar..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Numéro de Téléphone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="06 XX XX XX XX"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Ville *
                  </label>
                  <select
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {MOROCCAN_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Adresse de l'Établissement
                  </label>
                  <input
                    type="text"
                    placeholder="Quartier, Boulevard, Rue, Point de repère..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: DÉTAILS DE LA COMMANDE */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Calendar size={18} style={{ color: '#166534' }} />
              <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                2. Planification & Statut
              </strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                  Date Souhaitée *
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input
                    type="date"
                    required
                    value={requestedDeliveryDate}
                    onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setRequestedDeliveryDate(tomorrowStr)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                  >
                    Demain
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestedDeliveryDate(todayStr)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                  >
                    Aujourd'hui
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                  Statut de la Commande *
                </label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    backgroundColor: '#ffffff',
                    fontWeight: 600,
                  }}
                >
                  <option value="confirmed">Confirmée (Direct en préparation)</option>
                  <option value="preparing">En cours de préparation</option>
                  <option value="pending">En attente de confirmation</option>
                  <option value="delivering">Prête</option>
                  <option value="delivered">Finalisée</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                  Remarques ou Instructions (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Préciser calibre, heure de préparation, etc."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                  }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: ARTICLES & PRODUITS DE LA COMMANDE */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={18} style={{ color: '#166534' }} />
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                  3. Sélection des Produits & Prix Négociés ({items.length} article{items.length > 1 ? 's' : ''})
                </strong>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#166534', backgroundColor: '#f0fdf4', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 600 }}>
                Prix unitaires 100% ajustables par l'admin
              </span>
            </div>

            {/* Quick product selector bar */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '0.85rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                marginBottom: '1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.65rem',
                alignItems: 'end',
              }}
            >
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Rechercher & Choisir un Produit du Catalogue :
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    placeholder="Filtrer (ex: Tomate, Avocat, Citron...)"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                    }}
                  />
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    style={{
                      flex: 1.5,
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="">-- Sélectionner le produit --</option>
                    {filteredProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.price} DH/{p.unit})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Quantité ({activeProduct?.unit || 'Unité'}) :
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={inputQuantity}
                  onChange={(e) => setInputQuantity(Math.max(0.1, Number(e.target.value)))}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Prix Unitaire MAD :
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder={activeProduct ? `${activeProduct.price} DH` : '0.00'}
                  value={inputCustomPrice}
                  onChange={(e) => setInputCustomPrice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#166534',
                  }}
                />
              </div>

              <div>
                <button
                  type="button"
                  disabled={!activeProduct}
                  onClick={() => {
                    if (activeProduct) handleAddItem(activeProduct);
                  }}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    borderRadius: '6px',
                  }}
                >
                  <Plus size={16} />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>

            {/* Table of selected items */}
            {items.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2.5rem 1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1.5px dashed #cbd5e1',
                  color: '#64748b',
                }}
              >
                <ShoppingCart size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>
                  Aucun produit ajouté à la commande
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  Utilisez le sélecteur ci-dessus pour ajouter des fruits, légumes ou primeurs.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '0.6rem 0.75rem', color: '#475569', fontWeight: 700 }}>Produit</th>
                      <th style={{ padding: '0.6rem 0.75rem', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Unité</th>
                      <th style={{ padding: '0.6rem 0.75rem', color: '#475569', fontWeight: 700, textAlign: 'center', width: '140px' }}>Quantité</th>
                      <th style={{ padding: '0.6rem 0.75rem', color: '#475569', fontWeight: 700, textAlign: 'right', width: '140px' }}>Prix Unitaire (DH)</th>
                      <th style={{ padding: '0.6rem 0.75rem', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Sous-total</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', width: '45px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr
                        key={item.productId}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        }}
                      >
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {item.imageUrl && (
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }}
                              />
                            )}
                            <strong style={{ color: '#0f172a' }}>{item.productName}</strong>
                          </div>
                        </td>

                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '0.15rem 0.5rem',
                              backgroundColor: '#e2e8f0',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: '#334155',
                            }}
                          >
                            {item.unit}
                          </span>
                        </td>

                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, -1)}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0.1"
                              step="0.5"
                              value={item.quantity}
                              onChange={(e) => handleSetQuantityDirect(idx, e.target.value)}
                              style={{
                                width: '56px',
                                textAlign: 'center',
                                padding: '0.2rem',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, 1)}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdatePrice(idx, e.target.value)}
                              style={{
                                width: '70px',
                                textAlign: 'right',
                                padding: '0.2rem 0.35rem',
                                borderRadius: '4px',
                                border: '1px solid #86efac',
                                backgroundColor: '#f0fdf4',
                                fontWeight: 700,
                                color: '#166534',
                                fontSize: '0.85rem',
                              }}
                            />
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>DH</span>
                          </div>
                        </td>

                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                          <strong style={{ color: '#0f172a' }}>
                            {(item.quantity * item.unitPrice).toFixed(2)} DH
                          </strong>
                        </td>

                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '0.25rem',
                            }}
                            title="Supprimer la ligne"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 4: RÉCAPITULATIF FINANCIER */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569' }}>
              <span>Sous-total HT des articles :</span>
              <strong style={{ color: '#0f172a' }}>{subtotal.toFixed(2)} MAD</strong>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.2rem',
                fontWeight: 800,
                color: '#0f172a',
                borderTop: '2px dashed #cbd5e1',
                paddingTop: '0.75rem',
                marginTop: '0.25rem',
              }}
            >
              <span>Total Net à Facturer :</span>
              <span style={{ color: '#166534' }}>{total.toFixed(2)} MAD</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '0.85rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid #e2e8f0',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="btn btn-primary"
              style={{
                padding: '0.7rem 1.6rem',
                fontSize: '0.95rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: '10px',
                backgroundColor: '#166534',
                borderColor: '#15803d',
                boxShadow: '0 4px 14px rgba(22, 101, 52, 0.3)',
                cursor: isSubmitting || items.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? (
                <span>Enregistrement en cours...</span>
              ) : (
                <>
                  <Printer size={18} />
                  <span>Enregistrer & Ouvrir la Facture</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

