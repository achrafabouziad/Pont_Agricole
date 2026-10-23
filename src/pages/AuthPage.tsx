import React, { useState } from 'react';
import { store } from '../services/store';
import { BusinessType } from '../types';
import { UserCheck, AlertTriangle, ExternalLink } from 'lucide-react';

interface AuthPageProps {
  onSuccess: () => void;
  initialMode?: 'register' | 'login';
}

// Google Maps Pin Logo Component
const GoogleMapsIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
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
  { code: 'other', label: 'Autre', name: 'Autre indicatif international' },
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
        setErrorMsg("Accès GPS refusé ou indisponible (" + err.message + "). Vous pouvez renseigner l'adresse manuellement.");
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
          {/* Header Switcher Row (Identical to "Already a member? Sign in" in reference) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <img src="/logo.png" alt="Pont Agricole" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#166534', letterSpacing: '-0.01em' }}>
                Pont Agricole
              </span>
            </div>

            <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
              {isLoginMode ? (
                <>
                  Pas de compte ?{' '}
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
                    S'inscrire
                  </button>
                </>
              ) : (
                <>
                  Already a member?{' '}
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
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Form Title & Minimal Subtitle */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '2.1rem', fontWeight: 500, color: '#1e293b', margin: '0 0 0.35rem 0', letterSpacing: '-0.025em' }}>
              {isLoginMode ? 'Sign in' : 'Sign up'}
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              {isLoginMode
                ? 'Accédez à votre espace professionnel et consultez les cours du jour.'
                : 'Créez votre compte B2B pour commander vos fruits et légumes frais.'}
            </p>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div
              style={{
                padding: '0.7rem 0.9rem',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                borderRadius: '8px',
                fontSize: '0.82rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successNotice && (
            <div
              style={{
                padding: '0.7rem 0.9rem',
                backgroundColor: '#dcfce7',
                color: '#166534',
                borderRadius: '8px',
                fontSize: '0.82rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <UserCheck size={16} />
              <span>{successNotice}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {isLoginMode ? (
            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: '1.2rem' }}>
                <label className="auth-minimal-label">
                  Identifiant de connexion (Téléphone, Nom ou Email)
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
                  Mot de passe
                </label>
                <input
                  type="password"
                  className="auth-minimal-input"
                  placeholder="6+ caractères"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-pill-btn"
                style={{ width: '100%', marginBottom: '1.5rem' }}
              >
                {loading ? 'Connexion en cours...' : 'Sign in'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
                <span>Plateforme sécurisée pour professionnels de la restauration et hôtellerie.</span>
              </div>
            </form>
          ) : (
            /* REGISTER B2B FORM */
            <form onSubmit={handleRegisterSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="auth-minimal-label">Nom du Responsable / Chef *</label>
                  <input
                    type="text"
                    className="auth-minimal-input"
                    placeholder="Ex: Chef Karim Alami"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="auth-minimal-label">Nom de l'Établissement *</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="auth-minimal-label">Type d'Établissement</label>
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

                {/* International Phone */}
                <div>
                  <label className="auth-minimal-label">Numéro de Téléphone *</label>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <select
                      className="auth-minimal-input"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      style={{ width: '92px', flexShrink: 0, padding: '0.72rem 0.4rem', fontWeight: 600, cursor: 'pointer' }}
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
                        style={{ width: '65px', flexShrink: 0, padding: '0.72rem 0.4rem' }}
                        required
                      />
                    )}

                    <input
                      type="tel"
                      className="auth-minimal-input"
                      placeholder="06 61 XX XX XX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      style={{ flex: 1, minWidth: 0 }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="auth-minimal-label">Email Professionnel (Optionnel)</label>
                  <input
                    type="email"
                    className="auth-minimal-input"
                    placeholder="contact@restaurant.ma"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="auth-minimal-label">Mot de Passe *</label>
                  <input
                    type="password"
                    className="auth-minimal-input"
                    placeholder="6+ caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.1rem' }}>
                <div>
                  <label className="auth-minimal-label">Ville de Livraison</label>
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

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <label className="auth-minimal-label" style={{ marginBottom: 0 }}>Adresse Complète *</label>
                    <button
                      type="button"
                      onClick={handleAutoLocate}
                      disabled={locating}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#15803d',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: locating ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: 0,
                      }}
                      title="Détecter automatiquement avec Google Maps"
                    >
                      <GoogleMapsIcon size={12} />
                      <span>{locating ? 'GPS...' : 'Position Maps'}</span>
                    </button>
                  </div>
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
                      <span>Position GPS enregistrée :</span>
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

              {/* Checkbox (Matching reference photo: "I agree to all the statements included in the terms of service") */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '1.5rem' }}>
                <input
                  type="checkbox"
                  id="auth-terms"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#166534', cursor: 'pointer' }}
                />
                <label htmlFor="auth-terms" style={{ fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', lineHeight: 1.3 }}>
                  J'accepte les conditions d'accès B2B de la plateforme <span style={{ color: '#166534', fontWeight: 600 }}>Pont Agricole</span>
                </label>
              </div>

              {/* Create Account Pill Button (Identical to reference image) */}
              <button
                type="submit"
                disabled={loading}
                className="auth-pill-btn"
                style={{ width: '100%' }}
              >
                {loading ? 'Création du compte...' : 'Create Account'}
              </button>
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
                fontSize: '2.3rem',
                fontWeight: 400,
                lineHeight: 1.22,
                color: '#1e293b',
                letterSpacing: '-0.025em',
                maxWidth: '340px',
                margin: 0,
              }}
            >
              Access your kitchen's best{' '}
              <span style={{ color: '#16a34a', fontWeight: 600 }}>fresh produce</span>
            </h2>
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, maxWidth: '300px' }}>
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
          <div style={{ position: 'relative', zIndex: 2, fontSize: '0.75rem', color: '#94a3b8', letterSpacing: '0.02em' }}>
            Casablanca · Rabat · Marrakech · Tanger · Agadir · Fès
          </div>
        </div>
      </div>
    </div>
  );
};
