import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Minus, Calendar, MapPin, Truck, AlertTriangle, CheckCircle, ShieldAlert, ArrowRight, ShoppingBag, AlertCircle } from 'lucide-react';
import { store } from '../services/store';
import { CartItem, DeliveryZone, Order } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAuth: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToAuth,
  onOrderSuccess,
}) => {
  const [cart, setCart] = useState<CartItem[]>(store.getCart());
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('Casablanca');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [requestedDate, setRequestedDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentUser = store.getCurrentUser();
  const currentBusiness = store.getCurrentBusiness();

  // Load zones & prefill tomorrow's date
  useEffect(() => {
    store.getDeliveryZones().then((res) => {
      setZones(res);
      if (res.length > 0 && !selectedCity) {
        setSelectedCity(res[0].city);
      }
    });

    // Default requested delivery date: tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setRequestedDate(tomorrow.toISOString().split('T')[0]);

    if (currentBusiness) {
      if (currentBusiness.city) setSelectedCity(currentBusiness.city);
      if (currentBusiness.deliveryAddress) setDeliveryAddress(currentBusiness.deliveryAddress);
    }
  }, [currentBusiness]);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setCart([...store.getCart()]);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const currentZone = zones.find((z) => z.city.toLowerCase() === selectedCity.toLowerCase()) || zones[0];
  const subtotal = store.getCartSubtotal();
  const deliveryFee = 0; // Livraison 100% offerte
  const total = subtotal;
  const minOrderAmount = 0;
  const isMinOrderMet = true;

  // Account status check
  const isApproved = currentUser?.role === 'admin' || currentBusiness?.approvalStatus === 'approved';
  const isPending = currentBusiness?.approvalStatus === 'pending';

  const handleQuantityChange = (productId: string, qty: number) => {
    store.updateCartQuantity(productId, qty);
  };

  const handleRemove = (productId: string) => {
    store.removeFromCart(productId);
  };

  const handleCheckout = async () => {
    setErrorMessage(null);

    if (!currentUser) {
      setErrorMessage('Veuillez vous connecter à votre compte professionnel.');
      return;
    }

    if (!deliveryAddress.trim()) {
      setErrorMessage('Veuillez renseigner votre adresse de livraison complète.');
      return;
    }

    if (!requestedDate) {
      setErrorMessage('Veuillez choisir une date de livraison.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await store.placeOrder({
        deliveryCity: selectedCity,
        deliveryAddress: deliveryAddress.trim(),
        requestedDeliveryDate: requestedDate,
        customerNotes: notes.trim(),
      });

      if (result.success && result.order) {
        onClose();
        onOrderSuccess(result.order);
      } else {
        setErrorMessage(result.error || 'Erreur lors de l’envoi de la commande.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        {/* Header */}
        <div
          style={{
            padding: '1.25rem',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--primary-50)',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--primary-900)' }}>
              Panier Professionnel
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {cart.reduce((s, i) => s + i.quantity, 0)} articles sélectionnés
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '0.4rem', color: 'var(--text-muted)' }} title="Fermer">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-700)' }}>
                  <ShoppingBag size={28} strokeWidth={1.75} />
                </div>
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', color: 'var(--primary-900)', fontWeight: 700 }}>
                Votre panier est actuellement vide
              </h3>
              <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem', maxWidth: '280px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                Sélectionnez vos fruits, légumes et herbes fraîches directement depuis la mercuriale pro.
              </p>
              <button onClick={onClose} className="btn btn-primary btn-sm">
                Consulter le catalogue
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Product items list */}
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  style={{
                    display: 'flex',
                    gap: '0.85rem',
                    padding: '0.85rem',
                    backgroundColor: 'var(--bg-main)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    alignItems: 'center',
                  }}
                >
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {item.product.price.toFixed(2)} DH / {item.product.unit}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--primary-700)', marginTop: '0.2rem' }}>
                      {(item.product.price * item.quantity).toFixed(2)} DH
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                    <button
                      onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                      style={{ padding: '0.35rem 0.45rem', color: 'var(--text-main)' }}
                    >
                      <Minus size={12} />
                    </button>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '22px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                      style={{ padding: '0.35rem 0.45rem', color: 'var(--text-main)' }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(item.product.id)}
                    style={{ padding: '0.4rem', color: '#dc2626' }}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* Order Options */}
              <div style={{ marginTop: '1.25rem', padding: '1rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--primary-900)', marginBottom: '0.85rem' }}>
                  Détails de Livraison
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Ville de livraison</label>
                  <select
                    className="form-select"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '0.55rem' }}
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.city}>
                        {z.city}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Adresse de l’établissement (Restaurant, Hôtel, Café)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: 12 Rue de Normandie, Gauthier, Casablanca"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '0.55rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Date de livraison souhaitée</label>
                  <input
                    type="date"
                    className="form-input"
                    value={requestedDate}
                    onChange={(e) => setRequestedDate(e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '0.55rem' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Instructions cuisine ou déchargement</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Ex: Déposer quai de réception arrière avant 08h30"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '0.55rem' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Calculations & Submit */}
        {cart.length > 0 && (
          <div
            style={{
              padding: '1.25rem',
              borderTop: '1px solid var(--border-light)',
              backgroundColor: '#ffffff',
              boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Error banner */}
            {errorMessage && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  marginBottom: '0.85rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.4rem',
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Account warning if not logged or pending */}
            {!currentUser ? (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--amber-50)',
                  border: '1px solid var(--amber-400)',
                  color: 'var(--amber-600)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  marginBottom: '0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Connexion requise pour valider la commande B2B.</span>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToAuth();
                  }}
                  className="btn btn-sm btn-accent"
                  style={{ fontSize: '0.78rem' }}
                >
                  Se connecter
                </button>
              </div>
            ) : null}

            {/* Calculations lines */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              <span>Sous-total HT</span>
              <span style={{ fontWeight: 600 }}>{subtotal.toFixed(2)} DH</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
              <span>Frais de livraison ({selectedCity})</span>
              <span style={{ color: 'var(--primary-600)', fontWeight: 700 }}>
                Gratuits (0 DH)
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-900)', borderTop: '1px solid var(--border-light)', paddingTop: '0.6rem', marginBottom: '1rem' }}>
              <span>Total Estimé</span>
              <span style={{ color: 'var(--primary-800)' }}>{total.toFixed(2)} DH</span>
            </div>

            {/* Checkout Action */}
            <button
              onClick={handleCheckout}
              disabled={submitting || !currentUser}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '1rem',
                opacity: submitting || !currentUser ? 0.6 : 1,
                cursor: submitting || !currentUser ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? (
                <span>Validation en cours...</span>
              ) : !currentUser ? (
                <span>Se connecter pour commander</span>
              ) : (
                <>
                  <span>Confirmer la commande en gros</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
};
