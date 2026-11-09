import React, { useState } from 'react';
import { store } from '../services/store';
import { BusinessType } from '../types';
import { Building2, MapPin, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface EstablishmentSetupModalProps {
  clerkUser: any;
  onCompleted: () => void;
}

export const EstablishmentSetupModal: React.FC<EstablishmentSetupModalProps> = ({
  clerkUser,
  onCompleted,
}) => {
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('restaurant');
  const [city, setCity] = useState('Casablanca');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      setErrorMsg("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setLocating(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        setGoogleMapsUrl(mapsUrl);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'fr' } }
          );
          const data = await res.json();
          const road = data.address?.road || data.address?.suburb || '';
          const quarter = data.address?.quarter || '';
          const detectedCity = data.address?.city || data.address?.town || 'Casablanca';
          const street = [road, quarter].filter(Boolean).join(', ');
          const fullAddr = street ? `${street}, ${detectedCity}` : `Position GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
          setDeliveryAddress(fullAddr);
          if (detectedCity.toLowerCase().includes('casa')) setCity('Casablanca');
          else if (detectedCity.toLowerCase().includes('rabat')) setCity('Rabat - Salé');
          else if (detectedCity.toLowerCase().includes('marrakech')) setCity('Marrakech');
        } catch {
          setDeliveryAddress(`Position GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setErrorMsg("Impossible de récupérer la position GPS. Veuillez saisir l'adresse manuellement.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setErrorMsg("Veuillez renseigner le nom de votre établissement.");
      return;
    }
    if (!deliveryAddress.trim()) {
      setErrorMsg("Veuillez renseigner votre adresse de livraison.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await store.registerClerkBusiness(clerkUser, {
        businessName: businessName.trim(),
        businessType,
        city: city.trim() || 'Casablanca',
        deliveryAddress: deliveryAddress.trim(),
        googleMapsUrl: googleMapsUrl || undefined,
      });

      if (res.success) {
        onCompleted();
      } else {
        setErrorMsg(res.error || "Erreur lors de l'enregistrement de l'établissement.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Erreur inconnue lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          maxWidth: '540px',
          width: '100%',
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
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
            }}
          >
            <Building2 size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#14532d' }}>
              Finaliser votre profil B2B
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
              Renseignez votre établissement pour accéder aux tarifs de gros et commander.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              fontSize: '0.84rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
              Nom de l'Établissement (Restaurant, Café, Hôtel...) *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Restaurant Le Palmier, Café Central..."
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1.5px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                Type d'Établissement
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1.5px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="restaurant">Restaurant / Brasserie</option>
                <option value="cafe">Café / Salon de thé</option>
                <option value="hotel">Hôtel / Riad</option>
                <option value="caterer">Traiteur / Événementiel</option>
                <option value="other">Autre professionnel CHR</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                Ville de Livraison
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1.5px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="Casablanca">Casablanca & Environs</option>
                <option value="Rabat - Salé">Rabat - Salé</option>
                <option value="Marrakech">Marrakech</option>
                <option value="Tanger">Tanger</option>
                <option value="Agadir">Agadir</option>
                <option value="Fès - Meknès">Fès - Meknès</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                Adresse Complète de Livraison *
              </label>
              <button
                type="button"
                onClick={handleAutoLocate}
                disabled={locating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  color: '#15803d',
                  background: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  padding: '0.2rem 0.55rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <MapPin size={12} />
                <span>{locating ? 'Détection GPS...' : 'Détecter ma position GPS'}</span>
              </button>
            </div>
            <textarea
              required
              rows={3}
              placeholder="Ex: 45 Boulevard d'Anfa, Quartier Gauthier, Casablanca (près du Rond-point)"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1.5px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '0.85rem',
              backgroundColor: '#15803d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Enregistrement en cours...</span>
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                <span>Valider et accéder au catalogue</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
