import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Minus, AlertTriangle, ArrowRight, ShoppingBag, ArrowLeft } from 'lucide-react';
import { store } from '../services/store';
import { CartItem, DeliveryZone, Order, Product } from '../types';

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
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const currentUser = store.getCurrentUser();
  const currentBusiness = store.getCurrentBusiness();

  // Load products to offer quick add recommendations directly inside the cart
  useEffect(() => {
    if (isOpen) {
      store.getProducts().then(setAllProducts);
    }
  }, [isOpen]);

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

  const quickAddProducts = allProducts
    .filter((p) => p.isAvailable && !cart.some((item) => item.product.id === p.id))
    .slice(0, 8);

  const subtotal = store.getCartSubtotal();
  const total = subtotal;

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
        <div className="drawer-header">
          <div>
            <div className="drawer-header-title">Panier Professionnel</div>
            <div className="drawer-header-sub">
              {cart.length} produit{cart.length > 1 ? 's' : ''} ({cart.reduce((s, i) => s + i.quantity, 0)} articles)
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1.5px solid #86efac',
                borderRadius: '8px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#166534',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
              title="Ajouter d'autres produits"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>+ Ajouter d'autres produits</span>
            </button>
            <button onClick={onClose} className="drawer-close-btn" title="Fermer" aria-label="Fermer le panier">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="cart-body">
          {cart.length === 0 ? (
            <div className="cart-empty-box">
              <div className="cart-empty-icon">
                <ShoppingBag size={28} strokeWidth={1.75} />
              </div>
              <h3 className="cart-empty-title">Votre panier est actuellement vide</h3>
              <p className="cart-empty-sub">
                Sélectionnez vos fruits, légumes et herbes fraîches directement depuis la mercuriale pro.
              </p>
              <button onClick={onClose} className="btn btn-primary btn-sm">
                Consulter le catalogue
              </button>
            </div>
          ) : (
            <>
              {/* Product items list */}
              {cart.map((item) => (
                <div key={item.product.id} className="cart-item">
                  <div className="cart-item-top">
                    <img
                      className="cart-item-img"
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.product.name}</div>
                      <div className="cart-item-unit">
                        {item.product.price.toFixed(2)} DH / {item.product.unit}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(item.product.id)}
                      className="cart-remove-btn"
                      title="Supprimer"
                      aria-label={`Supprimer ${item.product.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="cart-item-bottom">
                    {/* Quantity Stepper */}
                    <div className="cart-qty-stepper">
                      <button
                        onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                        className="cart-qty-btn"
                        title="Diminuer la quantité"
                        aria-label="Diminuer la quantité"
                      >
                        <Minus size={15} />
                      </button>
                      <span className="cart-qty-num">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                        className="cart-qty-btn"
                        title="Augmenter la quantité"
                        aria-label="Augmenter la quantité"
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    <div className="cart-item-total">
                      {(item.product.price * item.quantity).toFixed(2)} DH
                    </div>
                  </div>
                </div>
              ))}

              {/* Quick Add More Products Row Directly Inside Cart */}
              {quickAddProducts.length > 0 && (
                <div
                  style={{
                    margin: '0.75rem 0 1.25rem',
                    padding: '0.85rem',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '14px',
                    border: '1.5px dashed #86efac',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.65rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      Ajouter d'autres produits à ce panier :
                    </span>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#15803d',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: 0,
                      }}
                    >
                      Voir le catalogue
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '0.6rem',
                      overflowX: 'auto',
                      paddingBottom: '0.35rem',
                    }}
                  >
                    {quickAddProducts.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          flexShrink: 0,
                          width: '135px',
                          backgroundColor: '#ffffff',
                          borderRadius: '10px',
                          padding: '0.55rem',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.3rem',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                      >
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          style={{
                            width: '100%',
                            height: '68px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                        <span
                          style={{
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            color: '#1e293b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={p.name}
                        >
                          {p.name}
                        </span>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '0.15rem',
                          }}
                        >
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#166534' }}>
                            {p.price.toFixed(2)} DH
                          </span>
                          <button
                            type="button"
                            onClick={() => store.addToCart(p, p.minimumQuantity || 1)}
                            style={{
                              backgroundColor: '#166534',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.22rem 0.5rem',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                          >
                            <Plus size={12} strokeWidth={3} />
                            Ajouter
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Options */}
              <div className="cart-details-card">
                <div className="cart-details-title">Détails de Livraison</div>

                <div className="form-group">
                  <label className="form-label">Ville de livraison</label>
                  <select
                    className="form-select"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.city}>
                        {z.city}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Adresse de l’établissement (Restaurant, Hôtel, Café)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: 12 Rue de Normandie, Gauthier, Casablanca"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date de livraison souhaitée</label>
                  <input
                    type="date"
                    className="form-input"
                    value={requestedDate}
                    onChange={(e) => setRequestedDate(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Instructions cuisine ou déchargement</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Ex: Déposer quai de réception arrière avant 08h30"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer with Calculations & Submit */}
        {cart.length > 0 && (
          <div className="drawer-footer">
            {/* Error banner */}
            {errorMessage && (
              <div className="cart-banner-error">
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Account warning if not logged or pending */}
            {!currentUser ? (
              <div className="cart-banner-warning">
                <span>Connexion requise pour valider la commande B2B.</span>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToAuth();
                  }}
                  className="btn btn-sm btn-accent"
                >
                  Se connecter
                </button>
              </div>
            ) : null}

            {/* Calculations lines */}
            <div className="cart-total-line">
              <span>Sous-total HT</span>
              <strong>{subtotal.toFixed(2)} DH</strong>
            </div>

            <div className="cart-total-line">
              <span>Frais de livraison ({selectedCity})</span>
              <span className="cart-total-line free" style={{ margin: 0 }}>
                Gratuits (0 DH)
              </span>
            </div>

            <div className="cart-total-line grand">
              <span>Total Estimé</span>
              <span>{total.toFixed(2)} DH</span>
            </div>

            {/* Checkout Action */}
            <button
              onClick={handleCheckout}
              disabled={submitting || !currentUser}
              className="btn btn-primary cart-checkout-btn"
            >
              {submitting ? (
                <span>Validation en cours...</span>
              ) : !currentUser ? (
                <span>Se connecter pour commander</span>
              ) : (
                <>
                  <span>Confirmer la commande en gros</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            {/* Continue shopping button so clients know they can add more items into the same cart */}
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{
                width: '100%',
                marginTop: '0.65rem',
                padding: '0.75rem',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.88rem',
                border: '1.5px solid #cbd5e1',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
              }}
            >
              + Continuer mes achats & ajouter d'autres produits
            </button>
          </div>
        )}
      </div>
    </>
  );
};
