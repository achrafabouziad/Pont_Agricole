import React, { useState } from 'react';
import { store } from '../services/store';
import { BusinessType } from '../types';
import { ShieldCheck, UserCheck, AlertTriangle, ArrowRight, Building2, Phone, Mail, Lock, MapPin, User, Navigation, ExternalLink } from 'lucide-react';

interface AuthPageProps {
  onSuccess: () => void;
  initialMode?: 'register' | 'login';
}

// Google Maps Pin Logo Component
const GoogleMapsIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
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
  { code: '+212', flag: '🇲🇦', name: 'Maroc (+212)' },
  { code: '+33', flag: '🇫🇷', name: 'France (+33)' },
  { code: '+34', flag: '🇪🇸', name: 'Espagne (+34)' },
  { code: '+971', flag: '🇦🇪', name: 'Émirats Arabes Unis (+971)' },
  { code: '+966', flag: '🇸🇦', name: 'Arabie Saoudite (+966)' },
  { code: '+1', flag: '🇺🇸', name: 'USA / Canada (+1)' },
  { code: '+44', flag: '🇬🇧', name: 'Royaume-Uni (+44)' },
  { code: '+32', flag: '🇧🇪', name: 'Belgique (+32)' },
  { code: '+49', flag: '🇩🇪', name: 'Allemagne (+49)' },
  { code: '+39', flag: '🇮🇹', name: 'Italie (+39)' },
  { code: '+31', flag: '🇳🇱', name: 'Pays-Bas (+31)' },
  { code: '+41', flag: '🇨🇭', name: 'Suisse (+41)' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal (+351)' },
  { code: '+90', flag: '🇹🇷', name: 'Turquie (+90)' },
  { code: '+221', flag: '🇸🇳', name: 'Sénégal (+221)' },
  { code: '+225', flag: '🇨🇮', name: "Côte d'Ivoire (+225)" },
  { code: '+222', flag: '🇲🇷', name: 'Mauritanie (+222)' },
  { code: '+216', flag: '🇹🇳', name: 'Tunisie (+216)' },
  { code: '+213', flag: '🇩🇿', name: 'Algérie (+213)' },
  { code: '+20', flag: '🇪🇬', name: 'Égypte (+20)' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar (+974)' },
  { code: '+965', flag: '🇰🇼', name: 'Koweït (+965)' },
  { code: '+86', flag: '🇨🇳', name: 'Chine (+86)' },
  { code: 'other', flag: '🌐', name: 'Autre indicatif...' },
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
          `Votre compte professionnel a été créé avec succès ! Vous pouvez vous connecter avec votre N° de téléphone (${fullPhone}), votre nom ou votre email.`
        );
        setTimeout(() => {
          onSuccess();
        }, 1300);
      } else {
        setErrorMsg(res.error || 'Erreur lors de l’inscription.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l’inscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container-mobile" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
      <div className="container" style={{ maxWidth: '580px', padding: '0 0.85rem' }}>
        {/* Card */}
        <div className="card auth-card-mobile" style={{ backgroundColor: '#ffffff', boxShadow: 'var(--shadow-md)' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <img src="/logo.png" alt="Pont Agricole" style={{ width: '42px', height: '42px', objectFit: 'contain', margin: '0 auto 0.4rem' }} />
            <h1 style={{ fontSize: '1.25rem', color: 'var(--primary-900)', marginBottom: '0.25rem' }}>
              {isLoginMode ? 'Espace Professionnel CHR' : 'Créer un Compte Professionnel'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.4 }}>
              {isLoginMode
                ? 'Accédez à vos commandes, vos tarifs de gros et vos livraisons matinales.'
                : 'Réservé aux cafés, restaurants, hôtels et traiteurs au Maroc.'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-main)', padding: '0.25rem', marginBottom: '1.1rem' }}>
            <button
              onClick={() => {
                setIsLoginMode(false);
                setErrorMsg(null);
              }}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: !isLoginMode ? 700 : 500,
                fontSize: '0.85rem',
                backgroundColor: !isLoginMode ? '#ffffff' : 'transparent',
                color: !isLoginMode ? 'var(--primary-800)' : 'var(--text-muted)',
                boxShadow: !isLoginMode ? 'var(--shadow-sm)' : 'none',
              }}
            >
              Inscription B2B
            </button>
            <button
              onClick={() => {
                setIsLoginMode(true);
                setErrorMsg(null);
              }}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: isLoginMode ? 700 : 500,
                fontSize: '0.85rem',
                backgroundColor: isLoginMode ? '#ffffff' : 'transparent',
                color: isLoginMode ? 'var(--primary-800)' : 'var(--text-muted)',
                boxShadow: isLoginMode ? 'var(--shadow-sm)' : 'none',
              }}
            >
              Connexion
            </button>
          </div>

          {/* Feedback Banners */}
          {errorMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertTriangle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successNotice && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#dcfce7',
                color: '#166534',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <UserCheck size={18} />
              <span>{successNotice}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {isLoginMode ? (
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Identifiant de Connexion (N° Téléphone, Nom d’utilisateur ou Email)
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="N° Téléphone (ex: 0661234567), Nom (ex: karimalami) ou Email"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    style={{ paddingLeft: '2.4rem' }}
                    required
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                  💡 Vous pouvez vous connecter soit avec votre <strong>N° de téléphone</strong> (mondial), votre <strong>nom/prénom</strong>, ou votre <strong>email</strong>.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Mot de Passe</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    style={{ paddingLeft: '2.4rem' }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
              >
                {loading ? 'Connexion en cours...' : 'Se Connecter'}
              </button>
            </form>
          ) : (
            /* REGISTER B2B FORM */
            <form onSubmit={handleRegisterSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                <div className="form-group">
                  <label className="form-label">Nom du Responsable / Chef *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Chef Karim Alami"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nom de l’Établissement *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Le Bistrot Gourmet"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                <div className="form-group">
                  <label className="form-label">Type d’Établissement</label>
                  <select
                    className="form-select"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                  >
                    <option value="restaurant">Restaurant / Brasserie</option>
                    <option value="cafe">Café / Salon de Thé</option>
                    <option value="hotel">Hôtel / Resort</option>
                    <option value="caterer">Traiteur / Événementiel</option>
                    <option value="other">Autre établissement pro</option>
                  </select>
                </div>

                {/* NUMERO DE TELEPHONE MONDIAL */}
                <div className="form-group">
                  <label className="form-label">Numéro de Téléphone (Mondial) *</label>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <select
                      className="form-select"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      style={{ width: '98px', flexShrink: 0, fontSize: '0.82rem', fontWeight: 600, padding: '0.6rem 0.35rem' }}
                    >
                      {WORLD_COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code === 'other' ? 'Autre' : c.code}
                        </option>
                      ))}
                    </select>

                    {countryCode === 'other' && (
                      <input
                        type="text"
                        className="form-input"
                        placeholder="+XXX"
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value)}
                        style={{ width: '70px', flexShrink: 0, padding: '0.6rem 0.4rem' }}
                        required
                      />
                    )}

                    <input
                      type="tel"
                      className="form-input"
                      placeholder="06 61 XX XX XX ou direct"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      style={{ flex: 1, minWidth: 0 }}
                      required
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                    🌍 Numéro marocain ou international accepté.
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                <div className="form-group">
                  <label className="form-label">Adresse E-mail (Facultative)</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="contact@restaurant.ma (optionnel)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Connexion possible par téléphone ou nom.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Mot de Passe *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Minimum 6 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* LOCALISATION AVEC GOOGLE MAPS AUTOMATIQUE */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                <div className="form-group">
                  <label className="form-label">Ville de Livraison</label>
                  <select
                    className="form-select"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  >
                    <option value="Casablanca">Casablanca</option>
                    <option value="Rabat - Salé">Rabat - Salé</option>
                    <option value="Marrakech">Marrakech</option>
                    <option value="Tanger">Tanger</option>
                    <option value="Fès - Meknès">Fès - Meknès</option>
                    <option value="Agadir">Agadir</option>
                  </select>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Adresse Complète *</label>
                    <button
                      type="button"
                      onClick={handleAutoLocate}
                      disabled={locating}
                      className="btn btn-secondary btn-sm"
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.72rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        backgroundColor: '#fff5f5',
                        borderColor: '#fca5a5',
                        color: '#dc2626',
                        fontWeight: 600,
                        cursor: locating ? 'wait' : 'pointer',
                      }}
                      title="Détecter automatiquement ma position avec Google Maps"
                    >
                      <GoogleMapsIcon size={13} />
                      <span>{locating ? 'GPS...' : 'Position Google Maps'}</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    className="form-input"
                    placeholder="Boulevard, quartier, point de repère"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    required
                  />

                  {gpsCoords && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem', fontSize: '0.74rem', color: '#166534' }}>
                      <GoogleMapsIcon size={12} />
                      <span>GPS détecté :</span>
                      <a
                        href={gpsCoords.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontWeight: 700, color: '#15803d', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        Voir sur Maps <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', backgroundColor: 'var(--bg-main)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                ✨ <strong>Accès direct :</strong> Votre compte est activé immédiatement. Vous pouvez passer votre première commande sans délai.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
              >
                {loading ? 'Création du compte...' : 'Créer Mon Compte Professionnel'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
