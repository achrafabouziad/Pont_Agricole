import React, { useState } from 'react';
import { store } from '../services/store';
import { BusinessType } from '../types';
import { UserCheck, AlertTriangle, ExternalLink, ArrowRight } from 'lucide-react';

interface AuthPageProps {
  onSuccess: () => void;
  initialMode?: 'register' | 'login';
}

// Google Maps Pin Logo Component
const GoogleMapsIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M12 2C7.58 2 4 5.58 4 10C4 16 12 22 12 22C12 22 20 16 20 10C20 5.58 16.42 2 12 2Z" fill="#EA4335" />
    <path d="M12 2C9.5 2 7.3 3.1 5.9 4.8L12 11V2Z" fill="#4285F4" />
    <path d="M12 22C12 22 17.5 17 19.3 12.5L12 11V22Z" fill="#34A853" />
    <path d="M4.7 12.5C5.8 15.5 8.7 18.9 12 22V11L4.7 12.5Z" fill="#FBBC05" />
    <circle cx="12" cy="10" r="3.2" fill="#FFFFFF" />
  </svg>
);

// Liste des indicatifs mondiaux
const WORLD_COUNTRY_CODES = [
  { code: '+212', label: 'MA +212', name: 'Maroc (+212)' },
  { code: '+33', label: 'FR +33', name: 'France (+33)' },
  { code: '+34', label: 'ES +34', name: 'Espagne (+34)' },
  { code: '+971', label: 'AE +971', name: 'Émirats Arabes Unis (+971)' },
  { code: '+966', label: 'SA +966', name: 'Arabie Saoudite (+966)' },
  { code: '+1', label: 'US/CA +1', name: 'USA / Canada (+1)' },
  { code: '+44', label: 'GB +44', name: 'Royaume-Uni (+44)' },
  { code: '+32', label: 'BE +32', name: 'Belgique (+32)' },
  { code: '+49', label: 'DE +49', name: 'Allemagne (+49)' },
  { code: '+39', label: 'IT +39', name: 'Italie (+39)' },
  { code: '+31', label: 'NL +31', name: 'Pays-Bas (+31)' },
  { code: '+41', label: 'CH +41', name: 'Suisse (+41)' },
  { code: '+351', label: 'PT +351', name: 'Portugal (+351)' },
  { code: '+90', label: 'TR +90', name: 'Turquie (+90)' },
  { code: '+221', label: 'SN +221', name: 'Sénégal (+221)' },
  { code: '+225', label: 'CI +225', name: "Côte d'Ivoire (+225)" },
  { code: '+222', label: 'MR +222', name: 'Mauritanie (+222)' },
  { code: '+216', label: 'TN +216', name: 'Tunisie (+216)' },
  { code: '+213', label: 'DZ +213', name: 'Algérie (+213)' },
  { code: '+20', label: 'EG +20', name: 'Égypte (+20)' },
  { code: '+974', label: 'QA +974', name: 'Qatar (+974)' },
  { code: '+965', label: 'KW +965', name: 'Koweït (+965)' },
  { code: '+86', label: 'CN +86', name: 'Chine (+86)' },
  { code: 'other', label: 'Autre', name: 'Autre indicatif' },
];

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, initialMode = 'register' }) => {
  const [isLoginMode, setIsLoginMode] = useState<boolean>(initialMode === 'login');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Login form state (universal: Email, Phone, or Name ID)
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('restaurant');
  
  // Worldwide Phone state
  const [countryCode, setCountryCode] = useState('+212');
  const [customCode, setCustomCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('Casablanca');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [termsAgreed, setTermsAgreed] = useState<boolean>(true);

  // Automatic Geolocation state
  const [locating, setLocating] = useState<boolean>(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; url: string; label: string } | null>(null);

  // Auto-locate with browser GPS and Google Maps
  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      setErrorMsg("La géolocalisation n'est pas disponible sur votre appareil.");
      return;
    }

    setLocating(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'fr' } }
          );
          const data = await res.json();
          const road = data.address?.road || data.address?.suburb || data.address?.neighbourhood || '';
          const quarter = data.address?.quarter || data.address?.suburb || '';
          const detectedCity = data.address?.city || data.address?.town || data.address?.municipality || data.address?.state || 'Casablanca';

          const street = [road, quarter].filter(Boolean).join(', ');
          const fullAddr = street ? `${street}, ${detectedCity}` : `Position GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
          
          setDeliveryAddress(fullAddr);

          const cLower = detectedCity.toLowerCase();
          if (cLower.includes('casa')) setCity('Casablanca');
          else if (cLower.includes('rabat') || cLower.includes('salé')) setCity('Rabat - Salé');
          else if (cLower.includes('marrakech')) setCity('Marrakech');
          else if (cLower.includes('tanger')) setCity('Tanger');
          else if (cLower.includes('agadir')) setCity('Agadir');
          else if (cLower.includes('fès') || cLower.includes('meknès')) setCity('Fès - Meknès');

          setGpsCoords({ lat, lng, url: mapsUrl, label: fullAddr });
        } catch {
          setDeliveryAddress(`Position GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          setGpsCoords({ lat, lng, url: mapsUrl, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setErrorMsg("Accès GPS indisponible (" + err.message + "). Vous pouvez renseigner l'adresse manuellement.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMsg('Veuillez renseigner votre identifiant (N° téléphone, nom ou email) et mot de passe.');
      return;
    }

    setLoading(true);
    try {
      const res = await store.login(loginIdentifier.trim(), loginPassword);
      if (res.success) {
        onSuccess();
      } else {
        setErrorMsg(res.error || 'Identifiant ou mot de passe incorrect.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!termsAgreed) {
      setErrorMsg("Veuillez accepter les conditions d'accès B2B pour continuer.");
      return;
    }

    const activeCode = countryCode === 'other' ? customCode.trim() : countryCode;
    const fullPhone = `${activeCode} ${phoneNumber.trim()}`.trim();

    if (!fullName.trim() || !businessName.trim() || !phoneNumber.trim() || !password || !deliveryAddress.trim()) {
      setErrorMsg('Veuillez remplir tous les champs obligatoires (Nom, Établissement, Téléphone, Adresse, Mot de passe).');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      const res = await store.register({
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        businessType,
        phone: fullPhone,
        email: email.trim() || undefined,
        password,
        city,
        deliveryAddress: deliveryAddress.trim(),
        googleMapsUrl: gpsCoords?.url,
      });

      if (res.success) {
        setSuccessNotice(
          `Compte créé avec succès ! Bienvenue sur la plateforme Pont Agricole.`
        );
        setTimeout(() => {
          onSuccess();
        }, 1100);
      } else {
        setErrorMsg(res.error || "Erreur lors de l'inscription.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-wrapper">
      <div className="auth-split-card">
        {/* LEFT COLUMN: THE CLEAN FORM */}
        <div className="auth-split-form-col">
          {/* Top Brand & Prominent Switcher Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img src="/logo.png" alt="Pont Agricole" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
              <div>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#166534', letterSpacing: '-0.02em', display: 'block', lineHeight: 1.1 }}>
                  Pont Agricole
                </span>
                <span style={{ fontSize: '0.62rem', letterSpacing: '0.12em', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  B2B CHR MAROC
                </span>
              </div>
            </div>

            {/* Clear, Clickable Pill Badge for Quick Switching */}
            {isLoginMode ? (
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(false);
                  setErrorMsg(null);
                }}
                className="auth-switch-badge-btn"
                title="Passer au formulaire d'inscription"
              >
                <span>Nouveau client ?</span>
                <span style={{ textDecoration: 'underline' }}>S'inscrire</span>
                <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(true);
                  setErrorMsg(null);
                }}
                className="auth-switch-badge-btn"
                title="Se connecter à un compte existant"
              >
                <span>Déjà inscrit ?</span>
                <span style={{ textDecoration: 'underline' }}>Se connecter</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          {/* Prominent Segmented Switcher (Impossible to miss) */}
          <div className="auth-segmented-switcher">
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(false);
                setErrorMsg(null);
              }}
              className={`auth-switcher-tab ${!isLoginMode ? 'active' : ''}`}
            >
              Inscription (Sign up)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(true);
                setErrorMsg(null);
              }}
              className={`auth-switcher-tab ${isLoginMode ? 'active' : ''}`}
            >
              Connexion (Sign in)
            </button>
          </div>

          {/* Form Title & Minimal Subtitle with High-End Typography */}
          <div style={{ marginBottom: '1.4rem' }}>
            <h1 className="auth-heading">
              {isLoginMode ? 'Se connecter' : 'Créer un compte'}
            </h1>
            <p className="auth-subheading">
              {isLoginMode
                ? 'Accédez à votre espace professionnel, vos commandes et vos tarifs de gros.'
                : 'Réservé aux restaurants, hôtels, cafés et traiteurs au Maroc.'}
            </p>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                borderRadius: '8px',
                fontSize: '0.84rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 500,
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successNotice && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#dcfce7',
                color: '#166534',
                borderRadius: '8px',
                fontSize: '0.84rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600,
              }}
            >
              <UserCheck size={16} style={{ flexShrink: 0 }} />
              <span>{successNotice}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {isLoginMode ? (
            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: '1.2rem' }}>
                <label className="auth-minimal-label">
                  <span>Identifiant de connexion *</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>Téléphone, Nom ou Email</span>
                </label>
                <input
                  type="text"
                  className="auth-minimal-input"
                  placeholder="Ex: 0661234567, karimalami ou email"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="auth-minimal-label">
                  <span>Mot de passe *</span>
                </label>
                <input
                  type="password"
                  className="auth-minimal-input"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-pill-btn"
                style={{ width: '100%', marginBottom: '1.25rem' }}
              >
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.84rem', color: '#64748b' }}>
                Pas encore de compte ?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(false);
                    setErrorMsg(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#166534',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Créer un compte professionnel B2B
                </button>
              </div>
            </form>
          ) : (
            /* REGISTER B2B FORM WITH STRICT 2-COLUMN HARMONIOUS ALIGNMENT */
            <form onSubmit={handleRegisterSubmit}>
              {/* ROW 1: Responsable & Etablissement */}
              <div className="auth-fields-grid">
                <div className="auth-field-col">
                  <label className="auth-minimal-label">
                    <span>Nom du Responsable / Chef *</span>
                  </label>
                  <input
                    type="text"
                    className="auth-minimal-input"
                    placeholder="Ex: Chef Karim Alami"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="auth-field-col">
                  <label className="auth-minimal-label">
                    <span>Nom de l'Établissement *</span>
                  </label>
                  <input
                    type="text"
                    className="auth-minimal-input"
                    placeholder="Ex: Le Bistrot Gourmet"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* ROW 2: Type d'Etablissement & Numero Mondial */}
              <div className="auth-fields-grid">
                <div className="auth-field-col">
                  <label className="auth-minimal-label">
                    <span>Type d'Établissement</span>
                  </label>
                  <select
                    className="auth-minimal-input"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="restaurant">Restaurant / Brasserie</option>
                    <option value="cafe">Café / Salon de Thé</option>
                    <option value="hotel">Hôtel / Resort</option>
                    <option value="caterer">Traiteur / Événementiel</option>
                    <option value="other">Autre établissement pro</option>
                  </select>
                </div>

                <div className="auth-field-col">
                  <label className="auth-minimal-label">
                    <span>Numéro de Téléphone *</span>
                  </label>
                  <div className="auth-phone-container">
                    <select
                      className="auth-minimal-input auth-country-select"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                    >
                      {WORLD_COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>

                    {countryCode === 'other' && (
                      <input
                        type="text"
                        className="auth-minimal-input"
                        placeholder="+XXX"
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value)}
                        style={{ width: '60px', flexShrink: 0, padding: '0 0.4rem' }}
                        required
                      />
                    )}

                    <input
                      type="tel"
                      className="auth-minimal-input auth-phone-input"
                      placeholder="06 61 XX XX XX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* ROW 3: Email Pro & Mot de passe */}
              <div className="auth-fields-grid">
                <div className="auth-field-col">
                  <label className="auth-minimal-label">
                    <span>Email Professionnel</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>Optionnel</span>
                  </label>
                  <input
                    type="email"
                    className="auth-minimal-input"
                    placeholder="contact@restaurant.ma"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="auth-field-col">
                  <label className="auth-minimal-label">
                    <span>Mot de Passe *</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>6+ car.</span>
                  </label>
                  <input
                    type="password"
                    className="auth-minimal-input"
                    placeholder="Minimum 6 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* ROW 4: Ville de Livraison & Adresse avec GPS */}
              <div className="auth-fields-grid">
                <div className="auth-field-col">
                  <label className="auth-minimal-label">
                    <span>Ville de Livraison</span>
                  </label>
                  <select
                    className="auth-minimal-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="Casablanca">Casablanca</option>
                    <option value="Rabat - Salé">Rabat - Salé</option>
                    <option value="Marrakech">Marrakech</option>
                    <option value="Tanger">Tanger</option>
                    <option value="Fès - Meknès">Fès - Meknès</option>
                    <option value="Agadir">Agadir</option>
                  </select>
                </div>

                <div className="auth-field-col">
                  <label className="auth-minimal-label">
                    <span>Adresse Complète *</span>
                    <button
                      type="button"
                      onClick={handleAutoLocate}
                      disabled={locating}
                      className="auth-maps-btn"
                      title="Détecter automatiquement avec Google Maps"
                    >
                      <GoogleMapsIcon size={12} />
                      <span>{locating ? 'GPS...' : 'Position Maps'}</span>
                    </button>
                  </label>

                  <input
                    type="text"
                    className="auth-minimal-input"
                    placeholder="Quartier, rue, repère"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    required
                  />

                  {gpsCoords && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem', fontSize: '0.72rem', color: '#166534' }}>
                      <GoogleMapsIcon size={11} />
                      <span>GPS détecté :</span>
                      <a
                        href={gpsCoords.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontWeight: 700, color: '#15803d', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        Vérifier sur Maps <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Checkbox (Terms) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', margin: '0.5rem 0 1.35rem 0' }}>
                <input
                  type="checkbox"
                  id="auth-terms"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#166534', cursor: 'pointer', flexShrink: 0 }}
                />
                <label htmlFor="auth-terms" style={{ fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', lineHeight: 1.35 }}>
                  J'accepte les conditions d'accès B2B de la plateforme <strong style={{ color: '#166534' }}>Pont Agricole</strong>
                </label>
              </div>

              {/* Create Account Pill Button */}
              <button
                type="submit"
                disabled={loading}
                className="auth-pill-btn"
                style={{ width: '100%', marginBottom: '1.15rem' }}
              >
                {loading ? 'Création du compte...' : 'Créer mon compte professionnel'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.84rem', color: '#64748b' }}>
                Vous avez déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(true);
                    setErrorMsg(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#166534',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Se connecter
                </button>
              </div>
            </form>
          )}
        </div>

        {/* RIGHT COLUMN: EDITORIAL VISUAL PANEL (MATCHING REFERENCE IMAGE) */}
        <div className="auth-split-visual-col">
          {/* Top Spaced Brand Tag (Matching "L I N K E D . S P A C E S") */}
          <div style={{ letterSpacing: '0.28em', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            P O N T . A G R I C O L E
          </div>

          {/* Catchphrase (Matching "Access your city's best shared spaces") */}
          <div style={{ position: 'relative', zIndex: 2, margin: '2rem 0' }}>
            <h2
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '2.4rem',
                fontWeight: 600,
                lineHeight: 1.18,
                color: '#0f172a',
                letterSpacing: '-0.03em',
                maxWidth: '340px',
                margin: 0,
              }}
            >
              Access your kitchen's best{' '}
              <span style={{ color: '#16a34a', fontWeight: 700 }}>fresh produce</span>
            </h2>
            <p style={{ marginTop: '0.85rem', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5, maxWidth: '300px' }}>
              Sélection maraîchère premium en direct des terroirs marocains pour chefs et gestionnaires CHR.
            </p>
          </div>

          {/* Clean Botanical Branch Art (Saved to public/auth_botanical.jpg) */}
          <img
            src="/auth_botanical.jpg"
            alt="Botanical branch"
            style={{
              position: 'absolute',
              right: '-10px',
              bottom: '-10px',
              width: '66%',
              height: '84%',
              objectFit: 'contain',
              objectPosition: 'right bottom',
              pointerEvents: 'none',
              opacity: 0.95,
            }}
          />

          {/* Subtle Bottom Brand Note */}
          <div style={{ position: 'relative', zIndex: 2, fontSize: '0.78rem', color: '#94a3b8', letterSpacing: '0.04em', fontWeight: 500 }}>
            Casablanca · Rabat · Marrakech · Tanger · Agadir · Fès
          </div>
        </div>
      </div>
    </div>
  );
};
