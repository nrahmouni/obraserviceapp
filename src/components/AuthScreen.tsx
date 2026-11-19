import React, { useState } from 'react';
import { AppUser, UserRole, Subcontrata, PendingRegistration } from '../types';
import {
  HardHat,
  Building2,
  Users,
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  KeyRound,
  Inbox,
  Send,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthScreenProps {
  users: AppUser[];
  subcontratas: Subcontrata[];
  onLogin: (user: AppUser) => void;
  onRegister: (newUser: AppUser, newSubcontrata?: Subcontrata) => void;
  onGoogleLogin?: () => Promise<void>;
}

type AuthMode = 'login' | 'register_request' | 'verify_email' | 'create_password';

export const AuthScreen: React.FC<AuthScreenProps> = ({
  users,
  subcontratas,
  onLogin,
  onRegister,
  onGoogleLogin,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Register request state (Step 1)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('encargado');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regSubTrade, setRegSubTrade] = useState('Estructuras & Encofrados');
  const [regSubCif, setRegSubCif] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  // Pending registration data while awaiting verification
  const [pendingReg, setPendingReg] = useState<PendingRegistration | null>(null);

  // Verification code input
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  // Create password state (Step 2)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Simulated email inbox modal open/close
  const [showSimulatedInbox, setShowSimulatedInbox] = useState(true);

  // --- Handlers ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const user = users.find(
      (u) =>
        u.email.toLowerCase().trim() === loginEmail.toLowerCase().trim() &&
        (u.password === loginPassword || !u.password)
    );

    if (user) {
      onLogin(user);
    } else {
      setLoginError(
        'Usuario o contraseña incorrectos. Puedes usar las cuentas demo rápidas de abajo o registrarte.'
      );
    }
  };

  const handleQuickLogin = (email: string) => {
    const user = users.find((u) => u.email === email);
    if (user) {
      onLogin(user);
    }
  };

  const handleGoogleSignInClick = async () => {
    if (!onGoogleLogin) return;
    setLoginError(null);
    setIsGoogleLoading(true);
    try {
      await onGoogleLogin();
    } catch (err) {
      setLoginError('No se pudo completar el inicio de sesión con Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Step 1: User sends email for verification (without password)
  const handleRegisterRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regName.trim() || !regEmail.trim()) {
      setRegError('Por favor completa todos los campos requeridos.');
      return;
    }

    // Check if email already registered in existing accounts
    const existing = users.find(
      (u) => u.email.toLowerCase().trim() === regEmail.toLowerCase().trim()
    );
    if (existing) {
      setRegError('Este correo electrónico ya está registrado. Inicia sesión con él.');
      return;
    }

    // Generate 6 digit verification code
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

    let subId: string | undefined = undefined;
    if (regRole === 'subcontrata') {
      subId = `sub-${Date.now()}`;
    }

    const pendingData: PendingRegistration = {
      id: `reg-${Date.now()}`,
      name: regName.trim(),
      email: regEmail.trim(),
      role: regRole,
      companyName:
        regRole === 'subcontrata'
          ? regCompanyName.trim() || `${regName.trim()} Subcontrata`
          : 'Construcciones & Desarrollos Cénit S.A.',
      subcontrataId: subId,
      subTrade: regSubTrade,
      subCif: regSubCif.trim().toUpperCase() || `B-${Math.floor(10000000 + Math.random() * 90000000)}`,
      verificationCode: generatedCode,
      createdAt: new Date().toISOString(),
    };

    setPendingReg(pendingData);
    setEnteredCode('');
    setCodeError(null);
    setShowSimulatedInbox(true);
    setMode('verify_email');
  };

  // Step 2: Verify email code or link
  const handleVerifyCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingReg) return;

    if (enteredCode.trim() === pendingReg.verificationCode) {
      setCodeError(null);
      setMode('create_password');
    } else {
      setCodeError('El código introducido no es correcto. Comprueba el código de 6 dígitos que te hemos enviado.');
    }
  };

  // Direct click from simulated email link
  const handleVerifyFromEmailLink = () => {
    setCodeError(null);
    setMode('create_password');
  };

  // Step 3: Create password & finish registration
  const handleCreatePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!pendingReg) return;

    if (newPassword.length < 4) {
      setPasswordError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden. Por favor, escríbelas de nuevo.');
      return;
    }

    let createdSub: Subcontrata | undefined = undefined;
    if (pendingReg.role === 'subcontrata' && pendingReg.subcontrataId) {
      createdSub = {
        id: pendingReg.subcontrataId,
        companyName: pendingReg.companyName,
        cif: pendingReg.subCif || `B-${Math.floor(10000000 + Math.random() * 90000000)}`,
        trade: pendingReg.subTrade || 'Obras & Reformas',
        contactPerson: pendingReg.name,
        phone: '+34 600 000 000',
        email: pendingReg.email,
        hourlyRateStandard: 24,
        assignedProjectIds: ['obra-1'],
      };
    }

    const newUser: AppUser = {
      id: `user-${Date.now()}`,
      name: pendingReg.name,
      email: pendingReg.email,
      password: newPassword,
      role: pendingReg.role,
      companyName: pendingReg.companyName,
      subcontrataId: pendingReg.subcontrataId,
      assignedProjectIds: ['obra-1'],
      emailVerified: true,
    };

    onRegister(newUser, createdSub);
  };

  const roleLabels: Record<UserRole, string> = {
    encargado: 'Encargado de Obra',
    subcontrata: 'Subcontrata (Gremio/Instalador)',
    jefe_obra: 'Jefe de Obra (Constructora)',
    constructora: 'Constructora (Dirección Central)',
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon & Title */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 shadow-md mb-3">
          <HardHat className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h1 className="text-3xl font-black text-slate-950 tracking-tight">
          ObraService
        </h1>
        <p className="mt-1 text-xs text-slate-600 font-semibold">
          Control Digital de Albaranes & Subcontratas en Obra
        </p>
        <div className="mt-3 flex justify-center">
          <PWAInstallButton />
        </div>
      </div>

      {/* Main Container */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-slate-200 sm:px-10">
          {/* Header tabs (only when in login or register_request) */}
          {(mode === 'login' || mode === 'register_request') && (
            <div className="flex border-b border-slate-200 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setLoginError(null);
                }}
                className={`flex-1 pb-3 text-center text-xs font-black transition-colors ${
                  mode === 'login'
                    ? 'border-b-2 border-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register_request');
                  setRegError(null);
                }}
                className={`flex-1 pb-3 text-center text-xs font-black transition-colors ${
                  mode === 'register_request'
                    ? 'border-b-2 border-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Registrar Nuevo Perfil
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* PANTALLA 1: INICIAR SESIÓN */}
          {/* ============================================================ */}
          {mode === 'login' && (
            <div className="space-y-5">
              <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {loginError}
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="ejemplo@cenit.es o tu correo"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl font-black text-sm text-slate-950 bg-amber-400 hover:bg-amber-500 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Entrar al Panel</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {onGoogleLogin && (
                  <button
                    type="button"
                    onClick={handleGoogleSignInClick}
                    disabled={isGoogleLoading}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>
                      {isGoogleLoading ? 'Conectando con Google...' : 'Continuar con Google (Firebase Auth)'}
                    </span>
                  </button>
                )}
              </form>

              {/* Acceso Rápido Demo con 1 Clic */}
              <div className="pt-4 border-t border-slate-200">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2 text-center">
                  O entra con 1 clic como rol de prueba (clave: 123)
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('encargado@cenit.es')}
                    className="p-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-left transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-amber-950 flex items-center gap-1.5">
                      <HardHat className="w-3.5 h-3.5 text-amber-700" />
                      Encargado
                    </span>
                    <span className="text-[10px] text-amber-800 block mt-0.5 truncate">
                      Manuel Gómez
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('antonio@encofrados.es')}
                    className="p-2.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-left transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-blue-950 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-700" />
                      Subcontrata
                    </span>
                    <span className="text-[10px] text-blue-800 block mt-0.5 truncate">
                      Encofrados Madrileños
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('jefe@cenit.es')}
                    className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-left transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      Jefe de Obra
                    </span>
                    <span className="text-[10px] text-emerald-800 block mt-0.5 truncate">
                      Javier Aranda
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin@cenit.es')}
                    className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-slate-950 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-700" />
                      Constructora
                    </span>
                    <span className="text-[10px] text-slate-600 block mt-0.5 truncate">
                      Dirección Central
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* PANTALLA 2: REGISTRO PASO 1 (DATOS Y ENVÍO DE EMAIL) */}
          {/* ============================================================ */}
          {mode === 'register_request' && (
            <form onSubmit={handleRegisterRequestSubmit} className="space-y-4 text-xs">
              <div className="pb-1">
                <span className="text-[11px] font-black text-amber-600 uppercase tracking-wider block">
                  Paso 1 de 2: Verificación de Correo
                </span>
                <p className="text-slate-600 text-xs mt-0.5">
                  Introduce tus datos. Te enviaremos un correo para verificar tu email y crear tu contraseña.
                </p>
              </div>

              {regError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {regError}
                </div>
              )}

              {/* Selector de Perfil */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  ¿Qué perfil vas a registrar?
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRegRole('encargado')}
                    className={`p-2 rounded-xl text-center border-2 transition-all cursor-pointer ${
                      regRole === 'encargado'
                        ? 'border-amber-500 bg-amber-50 text-slate-950 font-black'
                        : 'border-slate-200 bg-white text-slate-600 font-medium'
                    }`}
                  >
                    <HardHat className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                    <span className="text-[11px] block">Encargado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('subcontrata')}
                    className={`p-2 rounded-xl text-center border-2 transition-all cursor-pointer ${
                      regRole === 'subcontrata'
                        ? 'border-blue-600 bg-blue-50 text-blue-950 font-black'
                        : 'border-slate-200 bg-white text-slate-600 font-medium'
                    }`}
                  >
                    <Users className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                    <span className="text-[11px] block">Subcontrata</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('constructora')}
                    className={`p-2 rounded-xl text-center border-2 transition-all cursor-pointer ${
                      regRole === 'constructora'
                        ? 'border-slate-900 bg-slate-100 text-slate-950 font-black'
                        : 'border-slate-200 bg-white text-slate-600 font-medium'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mx-auto mb-1 text-slate-700" />
                    <span className="text-[11px] block">Constructora</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ej. Pedro Sánchez Ruiz"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Correo Electrónico (donde recibirás el enlace)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="tunombre@ejemplo.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Campos específicos si es Subcontrata */}
              {regRole === 'subcontrata' && (
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
                  <span className="text-[11px] font-black text-blue-900 uppercase tracking-wider block">
                    Datos de la Empresa Subcontratista
                  </span>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Nombre de la Empresa / Subcontrata
                    </label>
                    <input
                      type="text"
                      value={regCompanyName}
                      onChange={(e) => setRegCompanyName(e.target.value)}
                      placeholder="Ej. Estructuras & Cencofrados Madrileños S.L."
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        CIF de la Empresa
                      </label>
                      <input
                        type="text"
                        value={regSubCif}
                        onChange={(e) => setRegSubCif(e.target.value)}
                        placeholder="B-..."
                        className="w-full p-2 rounded-xl border border-slate-300 bg-white font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Gremio / Oficio
                      </label>
                      <input
                        type="text"
                        value={regSubTrade}
                        onChange={(e) => setRegSubTrade(e.target.value)}
                        placeholder="Ej. Pladur, Fontanería, Encofrados..."
                        className="w-full p-2 rounded-xl border border-slate-300 bg-white"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl font-black text-sm text-slate-950 bg-amber-400 hover:bg-amber-500 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Correo de Verificación</span>
              </button>
            </form>
          )}

          {/* ============================================================ */}
          {/* PANTALLA 3: COMPRUEBA TU BANDEJA DE ENTRADA (EMAIL VERIFICATION) */}
          {/* ============================================================ */}
          {mode === 'verify_email' && pendingReg && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  Comprueba tu correo electrónico
                </h2>
                <p className="text-xs text-slate-600">
                  Hemos enviado un correo a <span className="font-bold text-slate-900">{pendingReg.email}</span> para verificar que es correcto y permitirte crear tu contraseña.
                </p>
              </div>

              {/* SIMULATED EMAIL INBOX CARD */}
              <div className="bg-slate-50 border-2 border-blue-200 rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-200">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Inbox className="w-3.5 h-3.5 text-blue-600" />
                    Correo Recibido en tu Bandeja:
                  </span>
                  <span className="text-slate-400 font-mono">Ahora</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700">
                  <p>
                    <span className="font-bold text-slate-900">De:</span> ObraService &lt;verificacion@obraservice.es&gt;
                  </p>
                  <p>
                    <span className="font-bold text-slate-900">Para:</span> {pendingReg.name} &lt;{pendingReg.email}&gt;
                  </p>
                  <p className="font-bold text-slate-900 text-sm pt-1">
                    Asunto: Activa tu cuenta de {roleLabels[pendingReg.role]} y crea tu contraseña
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs space-y-3">
                  <p className="text-slate-700">
                    Hola <span className="font-bold">{pendingReg.name}</span>,
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Hemos recibido tu solicitud de registro como <span className="font-bold text-slate-900">{roleLabels[pendingReg.role]}</span>. Para verificar que esta dirección de correo te pertenece y crear tu contraseña, haz clic en el siguiente botón:
                  </p>

                  <button
                    type="button"
                    onClick={handleVerifyFromEmailLink}
                    className="w-full py-3 px-4 rounded-xl font-black text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>✓ Verificar Correo y Crear mi Contraseña</span>
                  </button>

                  <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-slate-100">
                    O si lo prefieres, introduce este código PIN de 6 dígitos:{' '}
                    <span className="font-mono font-black text-slate-900 text-sm tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                      {pendingReg.verificationCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Alternative: Enter 6-digit PIN manually */}
              <form onSubmit={handleVerifyCodeSubmit} className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-700 block">
                  ¿Prefieres introducir el código PIN manualmente?
                </span>

                {codeError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {codeError}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value)}
                    placeholder="Código de 6 dígitos (ej. 592814)"
                    className="flex-1 p-2.5 rounded-xl border border-slate-300 font-mono text-center tracking-widest text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Verificar
                  </button>
                </div>
              </form>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setMode('register_request')}
                  className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a cambiar los datos o correo</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* PANTALLA 4: CREACIÓN DE CONTRASEÑA TRAS VERIFICAR CORREO */}
          {/* ============================================================ */}
          {mode === 'create_password' && pendingReg && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-block font-mono">
                  ✓ Correo {pendingReg.email} Verificado
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2">
                  Crea tu Contraseña de Acceso
                </h2>
                <p className="text-xs text-slate-600">
                  Define la contraseña segura con la que iniciarás sesión en ObraService como{' '}
                  <span className="font-bold text-slate-900">{roleLabels[pendingReg.role]}</span>.
                </p>
              </div>

              <form onSubmit={handleCreatePasswordSubmit} className="space-y-4 text-xs">
                {passwordError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {passwordError}
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <p>
                    <span className="font-bold">Usuario:</span> {pendingReg.name}
                  </p>
                  <p>
                    <span className="font-bold">Email verificado:</span> {pendingReg.email}
                  </p>
                  <p>
                    <span className="font-bold">Perfil:</span> {roleLabels[pendingReg.role]}
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl font-black text-sm text-slate-950 bg-amber-400 hover:bg-amber-500 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Activar Cuenta y Entrar a ObraService</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Informative Footer Box */}
        <div className="mt-4 p-4 rounded-2xl bg-white/70 border border-slate-200 text-[11px] text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">🔒 Verificación Segura de Identidad en Obra:</p>
          <p>El envío de correo garantiza que cada encargado o subcontrata dispone de una dirección corporativa verídica antes de crear su contraseña y certificar albaranes.</p>
        </div>
      </div>
    </div>
  );
};
