import React, { useState } from 'react';
import { store } from '../services/store';
import { BusinessType } from '../types';
import { ShieldCheck, UserCheck, AlertTriangle, ArrowRight, Building2, Phone, Mail, Lock, MapPin } from 'lucide-react';

interface AuthPageProps {
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('restaurant');
  const [phone, setPhone] = useState('+212 6 ');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('Casablanca');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMsg('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    setLoading(true);
    try {
      const res = await store.login(loginEmail, loginPassword);
      if (res.success) {
        onSuccess();
      } else {
        setErrorMsg(res.error || 'Identifiants incorrects.');
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

    if (!fullName.trim() || !businessName.trim() || !phone.trim() || !email.trim() || !password || !deliveryAddress.trim()) {
      setErrorMsg('Veuillez remplir tous les champs obligatoires.');
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
        phone: phone.trim(),
        email: email.trim(),
        password,
        city,
        deliveryAddress: deliveryAddress.trim(),
      });

      if (res.success) {
        setSuccessNotice(
          'Votre compte professionnel a été créé avec succès ! Il est actuellement en cours de vérification par notre équipe commerciale pour validation de vos tarifs CHR.'
        );
        setTimeout(() => {
          onSuccess();
        }, 1500);
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
    <div style={{ padding: '3.5rem 0 6rem', minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
      <div className="container" style={{ maxWidth: '640px' }}>
        {/* Card */}
        <div className="card" style={{ padding: '2.5rem', backgroundColor: '#ffffff', boxShadow: 'var(--shadow-md)' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/logo.png" alt="Pont Agricole" style={{ width: '56px', height: '56px', objectFit: 'contain', margin: '0 auto 0.75rem' }} />
            <h1 style={{ fontSize: '1.65rem', color: 'var(--primary-900)', marginBottom: '0.4rem' }}>
              {isLoginMode ? 'Espace Professionnel CHR' : 'Créer un Compte Professionnel'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {isLoginMode
                ? 'Accédez à vos commandes, vos tarifs de gros et vos livraisons matinales.'
                : 'Réservé aux cafés, restaurants, hôtels et traiteurs au Maroc.'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-main)', padding: '0.35rem', marginBottom: '1.75rem' }}>
            <button
              onClick={() => {
                setIsLoginMode(true);
                setErrorMsg(null);
              }}
              style={{
                flex: 1,
                padding: '0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: isLoginMode ? 700 : 500,
                backgroundColor: isLoginMode ? '#ffffff' : 'transparent',
                color: isLoginMode ? 'var(--primary-800)' : 'var(--text-muted)',
                boxShadow: isLoginMode ? 'var(--shadow-sm)' : 'none',
              }}
            >
              Connexion
            </button>
            <button
              onClick={() => {
                setIsLoginMode(false);
                setErrorMsg(null);
              }}
              style={{
                flex: 1,
                padding: '0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: !isLoginMode ? 700 : 500,
                backgroundColor: !isLoginMode ? '#ffffff' : 'transparent',
                color: !isLoginMode ? 'var(--primary-800)' : 'var(--text-muted)',
                boxShadow: !isLoginMode ? 'var(--shadow-sm)' : 'none',
              }}
            >
              Inscription B2B
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
              <div className="form-group">
                <label className="form-label">Adresse E-mail Professionnelle</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="direction@votre-etablissement.ma"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    style={{ paddingLeft: '2.4rem' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mot de Passe</label>
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
                style={{ width: '100%', marginTop: '0.75rem', padding: '0.85rem' }}
              >
                {loading ? 'Connexion...' : 'Se Connecter'}
              </button>
            </form>
          ) : (
            /* REGISTER B2B FORM */
            <form onSubmit={handleRegisterSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nom du Responsable / Chef</label>
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
                  <label className="form-label">Nom de l’Établissement</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
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

                <div className="form-group">
                  <label className="form-label">Téléphone Marocain (+212)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+212 6 61 XX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Adresse E-mail</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="contact@restaurant.ma"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mot de Passe</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
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
                  <label className="form-label">Adresse Complète</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Boulevard, quartier, point de repère"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', backgroundColor: 'var(--bg-main)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                ℹ️ <strong>Règle commerciale B2B :</strong> Votre compte sera vérifié avant l’envoi de votre première commande pour vous affecter les tarifs de gros et les plages de livraison matinale.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem' }}
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
