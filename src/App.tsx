/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  UserRole,
  AppUser,
  ObraProject,
  Subcontrata,
  Worker,
  StaffMember,
  AlbaranDiario,
} from './types';
import {
  INITIAL_USERS,
  INITIAL_OBRAS,
  INITIAL_SUBCONTRATAS,
  INITIAL_WORKERS,
  INITIAL_STAFF,
  INITIAL_ALBARANES,
} from './data/mockData';

import {
  db,
  auth,
  googleProvider,
  doc,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  deleteField,
  signInWithPopup,
  firebaseSignOut,
  OperationType,
  handleFirestoreError,
} from './firebase';

import { AuthScreen } from './components/AuthScreen';
import { EncargadoQuickView } from './components/EncargadoQuickView';
import { SubcontrataPortalView } from './components/SubcontrataPortalView';
import { JefeObraApprovalView } from './components/JefeObraApprovalView';
import { ConstructoraAdminView } from './components/ConstructoraAdminView';
import { AlbaranDetailModal } from './components/AlbaranDetailModal';
import { ResumenAcumuladoModal } from './components/ResumenAcumuladoModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

import {
  HardHat,
  Building2,
  Users,
  ShieldCheck,
  LogOut,
  CloudCheck,
  Share2,
} from 'lucide-react';

// Helper to strip undefined fields before writing to Firestore
function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        cleaned[k] = cleanUndefined(v);
      } else {
        cleaned[k] = v;
      }
    }
  }
  return cleaned as T;
}

export default function App() {
  // Users list
  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('obraservice_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  // Current authenticated user
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('obraservice_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Domain States
  const [obras, setObras] = useState<ObraProject[]>(() => {
    const saved = localStorage.getItem('obraservice_obras');
    return saved ? JSON.parse(saved) : INITIAL_OBRAS;
  });

  const [subcontratas, setSubcontratas] = useState<Subcontrata[]>(() => {
    const saved = localStorage.getItem('obraservice_subcontratas');
    return saved ? JSON.parse(saved) : INITIAL_SUBCONTRATAS;
  });

  const [workers, setWorkers] = useState<Worker[]>(() => {
    const saved = localStorage.getItem('obraservice_workers');
    return saved ? JSON.parse(saved) : INITIAL_WORKERS;
  });

  const [staff, setStaff] = useState<StaffMember[]>(() => {
    const saved = localStorage.getItem('obraservice_staff');
    return saved ? JSON.parse(saved) : INITIAL_STAFF;
  });

  const [albaranes, setAlbaranes] = useState<AlbaranDiario[]>(() => {
    const saved = localStorage.getItem('obraservice_albaranes');
    return saved ? JSON.parse(saved) : INITIAL_ALBARANES;
  });

  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const hasSeededRef = useRef<boolean>(false);

  // Modal inspection of any albarán
  const [selectedAlbaranForModal, setSelectedAlbaranForModal] =
    useState<AlbaranDiario | null>(null);

  // Unified accumulated summary modal (Oficiales vs Peones by date range)
  const [isResumenAcumuladoOpen, setIsResumenAcumuladoOpen] = useState(false);
  const [resumenPreselectedObraId, setResumenPreselectedObraId] = useState<string | undefined>(undefined);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // --- Initial Cloud Seeding & Real-Time Firestore Listeners ---
  useEffect(() => {
    let unsubUsers: (() => void) | undefined;
    let unsubObras: (() => void) | undefined;
    let unsubSubs: (() => void) | undefined;
    let unsubWorkers: (() => void) | undefined;
    let unsubStaff: (() => void) | undefined;
    let unsubAlbaranes: (() => void) | undefined;

    async function initCloudSync() {
      try {
        // Seed initial data if Firestore is empty
        if (!hasSeededRef.current) {
          hasSeededRef.current = true;
          const obrasSnap = await getDocs(collection(db, 'obras'));
          if (obrasSnap.empty) {
            const batch = writeBatch(db);
            for (const u of INITIAL_USERS) {
              batch.set(doc(db, 'users', u.id), cleanUndefined(u));
            }
            for (const o of INITIAL_OBRAS) {
              batch.set(doc(db, 'obras', o.id), cleanUndefined(o));
            }
            for (const s of INITIAL_SUBCONTRATAS) {
              batch.set(doc(db, 'subcontratas', s.id), cleanUndefined(s));
            }
            for (const w of INITIAL_WORKERS) {
              batch.set(doc(db, 'workers', w.id), cleanUndefined(w));
            }
            for (const st of INITIAL_STAFF) {
              batch.set(doc(db, 'staff', st.id), cleanUndefined(st));
            }
            for (const alb of INITIAL_ALBARANES) {
              batch.set(doc(db, 'albaranes', alb.id), cleanUndefined(alb));
            }
            await batch.commit();
          }
        }

        // Attach real-time listeners
        unsubUsers = onSnapshot(
          collection(db, 'users'),
          (snap) => {
            if (!snap.empty) {
              const list = snap.docs.map((d) => d.data() as AppUser);
              setUsers(list);
              localStorage.setItem('obraservice_users', JSON.stringify(list));
            }
            setIsCloudSynced(true);
          },
          (error) => {
            try {
              handleFirestoreError(error, OperationType.LIST, 'users');
            } catch {
              // Keep local state functional if offline
            }
          }
        );

        unsubObras = onSnapshot(
          collection(db, 'obras'),
          (snap) => {
            if (!snap.empty) {
              const list = snap.docs.map((d) => d.data() as ObraProject);
              setObras(list);
              localStorage.setItem('obraservice_obras', JSON.stringify(list));
            }
            setIsCloudSynced(true);
          },
          (error) => {
            try {
              handleFirestoreError(error, OperationType.LIST, 'obras');
            } catch {
              // Keep local state functional if offline
            }
          }
        );

        unsubSubs = onSnapshot(
          collection(db, 'subcontratas'),
          (snap) => {
            if (!snap.empty) {
              const list = snap.docs.map((d) => d.data() as Subcontrata);
              setSubcontratas(list);
              localStorage.setItem('obraservice_subcontratas', JSON.stringify(list));
            }
          },
          (error) => {
            try {
              handleFirestoreError(error, OperationType.LIST, 'subcontratas');
            } catch {
              // Keep local state functional if offline
            }
          }
        );

        unsubWorkers = onSnapshot(
          collection(db, 'workers'),
          (snap) => {
            if (!snap.empty) {
              const list = snap.docs.map((d) => d.data() as Worker);
              setWorkers(list);
              localStorage.setItem('obraservice_workers', JSON.stringify(list));
            }
          },
          (error) => {
            try {
              handleFirestoreError(error, OperationType.LIST, 'workers');
            } catch {
              // Keep local state functional if offline
            }
          }
        );

        unsubStaff = onSnapshot(
          collection(db, 'staff'),
          (snap) => {
            if (!snap.empty) {
              const list = snap.docs.map((d) => d.data() as StaffMember);
              setStaff(list);
              localStorage.setItem('obraservice_staff', JSON.stringify(list));
            }
          },
          (error) => {
            try {
              handleFirestoreError(error, OperationType.LIST, 'staff');
            } catch {
              // Keep local state functional if offline
            }
          }
        );

        let isFirstAlbaranesSnapshot = true;
        unsubAlbaranes = onSnapshot(
          collection(db, 'albaranes'),
          (snap) => {
            if (!snap.empty) {
              const list = snap.docs
                .map((d) => d.data() as AlbaranDiario)
                .sort((a, b) => b.date.localeCompare(a.date));
              setAlbaranes(list);
              localStorage.setItem('obraservice_albaranes', JSON.stringify(list));

              if (!isFirstAlbaranesSnapshot && !snap.metadata.hasPendingWrites) {
                const changes = snap.docChanges();
                const addedChange = changes.find((c) => c.type === 'added');
                const modifiedChange = changes.find((c) => c.type === 'modified');

                if (addedChange) {
                  const alb = addedChange.doc.data() as AlbaranDiario;
                  showToast(
                    `Nuevo albarán recibido en tiempo real: ${alb.albaranNumber} (${alb.projectTitle} · ${alb.totalHours} Ud.)`
                  );
                } else if (modifiedChange) {
                  const alb = modifiedChange.doc.data() as AlbaranDiario;
                  if (alb.status === 'pendiente_subcontrata' && alb.rectification) {
                    showToast(
                      `Albarán rectificado por Encargado: ${alb.albaranNumber} (${alb.totalHours} Ud.) pendiente de nueva validación.`
                    );
                  } else if (alb.status === 'validado_subcontrata') {
                    showToast(
                      `VºBº recibido en tiempo real: ${alb.albaranNumber} listo para Jefe de Obra.`
                    );
                  } else if (alb.status === 'aprobado_final') {
                    showToast(
                      `Albarán certificado en tiempo real: ${alb.albaranNumber}.`
                    );
                  }
                }
              }
            }
            isFirstAlbaranesSnapshot = false;
            setIsCloudSynced(true);
          },
          (error) => {
            try {
              handleFirestoreError(error, OperationType.LIST, 'albaranes');
            } catch {
              // Keep local state functional if offline
            }
          }
        );
      } catch (err) {
        console.error('Error initializing Firestore sync:', err);
      }
    }

    initCloudSync();

    return () => {
      unsubUsers?.();
      unsubObras?.();
      unsubSubs?.();
      unsubWorkers?.();
      unsubStaff?.();
      unsubAlbaranes?.();
    };
  }, []);

  // Keep currentUser persisted in localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('obraservice_auth_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('obraservice_auth_user');
    }
  }, [currentUser]);

  // --- Auth Handlers ---
  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    showToast(`Bienvenido/a, ${user.name}`);
  };

  const handleGoogleLogin = async () => {
    const credential = await signInWithPopup(auth, googleProvider);
    const fbUser = credential.user;
    const email = fbUser.email || '';

    // Check if user already exists in users list
    const existingUser = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() || u.id === fbUser.uid
    );

    if (existingUser) {
      setCurrentUser(existingUser);
      showToast(`Sesión iniciada con Google como ${existingUser.name}`);
      return;
    }

    // Create new Constructora/Admin user profile in Firestore
    const newGoogleUser: AppUser = {
      id: fbUser.uid.replace(/[^a-zA-Z0-9_-]/g, ''),
      name: (fbUser.displayName || email.split('@')[0] || 'Usuario ObraService').slice(0, 120),
      email: email.slice(0, 160),
      role: 'constructora',
      companyName: 'Construcciones & Desarrollos Cénit S.A.',
      assignedProjectIds: obras.map((o) => o.id),
      emailVerified: true,
    };

    try {
      await setDoc(doc(db, 'users', newGoogleUser.id), cleanUndefined(newGoogleUser));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${newGoogleUser.id}`);
    }

    setUsers((prev) => [...prev, newGoogleUser]);
    setCurrentUser(newGoogleUser);
    showToast(`Cuenta vinculada con Google. ¡Bienvenido/a, ${newGoogleUser.name}!`);
  };

  const handleRegister = async (newUser: AppUser, newSubcontrata?: Subcontrata) => {
    setUsers((prev) => [...prev, newUser]);
    if (newSubcontrata) {
      setSubcontratas((prev) => [...prev, newSubcontrata]);
    }
    setCurrentUser(newUser);
    showToast(`Cuenta creada y guardada en la nube. ¡Bienvenido/a, ${newUser.name}!`);

    try {
      await setDoc(doc(db, 'users', newUser.id), cleanUndefined(newUser));
      if (newSubcontrata) {
        await setDoc(doc(db, 'subcontratas', newSubcontrata.id), cleanUndefined(newSubcontrata));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${newUser.id}`);
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore if not signed in via firebase auth
    }
    setCurrentUser(null);
    showToast('Sesión cerrada correctamente.');
  };

  // --- Albarán & Work Handlers (Real-Time Firestore Sync) ---
  const handleSaveAlbaran = async (newAlbaran: AlbaranDiario) => {
    setAlbaranes((prev) => [newAlbaran, ...prev]);

    try {
      await setDoc(doc(db, 'albaranes', newAlbaran.id), cleanUndefined(newAlbaran));
      showToast(
        `Albarán ${newAlbaran.albaranNumber} sincronizado en la nube. Notificado a ${newAlbaran.subcontrataName}.`
      );
    } catch (error) {
      showToast('Error al enviar el albarán a la nube. Verifica tu conexión.');
      handleFirestoreError(error, OperationType.CREATE, `albaranes/${newAlbaran.id}`);
    }
  };

  const handleValidateAlbaran = async (
    albaranId: string,
    approved: boolean,
    reviewerName: string,
    comments?: string,
    signatureDataUrl?: string
  ) => {
    const newStatus = approved ? 'validado_subcontrata' : 'observado';
    const subcontrataReview = cleanUndefined({
      approved,
      date: new Date().toISOString(),
      reviewedBy: reviewerName,
      comments,
      signature: signatureDataUrl || `${reviewerName} - Validado`,
    });

    setAlbaranes((prev) =>
      prev.map((a) =>
        a.id === albaranId
          ? {
              ...a,
              status: newStatus,
              subcontrataReview,
            }
          : a
      )
    );

    try {
      await updateDoc(doc(db, 'albaranes', albaranId), {
        status: newStatus,
        subcontrataReview,
      });
      if (approved) {
        showToast(
          'Visto bueno y firma digital de la subcontrata guardados en la nube. Notificado al Jefe de Obra.'
        );
      } else {
        showToast('Discrepancia registrada en la nube.');
      }
    } catch (error) {
      showToast('Error al guardar la validación en la nube. Revisa tu conexión.');
      handleFirestoreError(error, OperationType.UPDATE, `albaranes/${albaranId}`);
    }
  };

  const handleFinalApproveAlbaran = async (
    albaranId: string,
    jefeName: string,
    comments?: string,
    signatureDataUrl?: string
  ) => {
    const jefeObraApproval = cleanUndefined({
      approved: true,
      date: new Date().toISOString(),
      approvedBy: jefeName,
      comments,
      signature: signatureDataUrl || `${jefeName} - Certificado`,
    });

    setAlbaranes((prev) =>
      prev.map((a) =>
        a.id === albaranId
          ? {
              ...a,
              status: 'aprobado_final',
              jefeObraApproval,
            }
          : a
      )
    );

    try {
      await updateDoc(doc(db, 'albaranes', albaranId), {
        status: 'aprobado_final',
        jefeObraApproval,
      });
      showToast('¡Albarán firmado, certificado y sincronizado en la nube en tiempo real!');
    } catch (error) {
      showToast('Error al certificar el albarán en la nube. Revisa tu conexión.');
      handleFirestoreError(error, OperationType.UPDATE, `albaranes/${albaranId}`);
    }
  };

  const handleRectifyAlbaran = async (rectified: AlbaranDiario) => {
    setAlbaranes((prev) =>
      prev.map((a) => (a.id === rectified.id ? rectified : a))
    );

    try {
      const updatePayload: Record<string, any> = cleanUndefined({
        workers: rectified.workers,
        totalHours: rectified.totalHours,
        date: rectified.date,
        tajoZone: rectified.tajoZone || '',
        generalNotes: rectified.generalNotes,
        photoUrl: rectified.photoUrl,
        encargadoSignature: rectified.encargadoSignature,
        status: rectified.status,
        rectification: rectified.rectification,
      });
      updatePayload.subcontrataReview = deleteField();
      updatePayload.jefeObraApproval = deleteField();

      await updateDoc(doc(db, 'albaranes', rectified.id), updatePayload);
      showToast(
        `Albarán ${rectified.albaranNumber} rectificado (${rectified.totalHours} Ud.) y sincronizado en la nube.`
      );
    } catch (error) {
      showToast('Error al guardar la rectificación en la nube. Revisa tu conexión.');
      handleFirestoreError(error, OperationType.UPDATE, `albaranes/${rectified.id}`);
    }
  };

  const handleAddWorker = async (newWorker: Worker) => {
    setWorkers((prev) => [...prev, newWorker]);
    showToast(`Trabajador "${newWorker.name}" dado de alta en la base de datos.`);

    try {
      await setDoc(doc(db, 'workers', newWorker.id), cleanUndefined(newWorker));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `workers/${newWorker.id}`);
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    setWorkers((prev) => prev.filter((w) => w.id !== workerId));
    showToast('Trabajador eliminado de la plantilla.');

    try {
      await deleteDoc(doc(db, 'workers', workerId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `workers/${workerId}`);
    }
  };

  const handleCreateObra = async (newObra: ObraProject) => {
    setObras((prev) => [newObra, ...prev]);
    showToast(`Obra "${newObra.title}" creada y guardada en la nube.`);

    try {
      await setDoc(doc(db, 'obras', newObra.id), cleanUndefined(newObra));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `obras/${newObra.id}`);
    }
  };

  const handleAddSubcontrata = async (newSub: Subcontrata) => {
    setSubcontratas((prev) => [...prev, newSub]);
    showToast(`Subcontrata "${newSub.companyName}" homologada en la nube.`);

    try {
      await setDoc(doc(db, 'subcontratas', newSub.id), cleanUndefined(newSub));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `subcontratas/${newSub.id}`);
    }
  };

  const handleAddStaff = async (newStaff: StaffMember) => {
    setStaff((prev) => [...prev, newStaff]);
    showToast(`Técnico "${newStaff.name}" creado en la nube.`);

    try {
      await setDoc(doc(db, 'staff', newStaff.id), cleanUndefined(newStaff));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `staff/${newStaff.id}`);
    }
  };

  // If user is not authenticated, show the login and register page
  if (!currentUser) {
    return (
      <AuthScreen
        users={users}
        subcontratas={subcontratas}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onGoogleLogin={handleGoogleLogin}
      />
    );
  }

  // Active subcontrata for subcontrata profile
  const userSubcontrata =
    subcontratas.find((s) => s.id === currentUser.subcontrataId) ||
    subcontratas[0];

  const roleLabelMap: Record<UserRole, { title: string; badge: string; icon: typeof HardHat }> = {
    encargado: {
      title: 'Encargado de Obra',
      badge: 'bg-amber-100 text-amber-950 border-amber-300',
      icon: HardHat,
    },
    subcontrata: {
      title: `Subcontrata: ${userSubcontrata?.companyName || currentUser.companyName}`,
      badge: 'bg-blue-100 text-blue-950 border-blue-300',
      icon: Users,
    },
    jefe_obra: {
      title: 'Jefe de Obra (Constructora)',
      badge: 'bg-emerald-100 text-emerald-950 border-emerald-300',
      icon: ShieldCheck,
    },
    constructora: {
      title: 'Constructora (Dirección Central)',
      badge: 'bg-slate-900 text-white border-slate-900',
      icon: Building2,
    },
  };

  const currentRoleInfo = roleLabelMap[currentUser.role];
  const RoleIcon = currentRoleInfo.icon;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      <OfflineIndicator />

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white text-xs px-5 py-3 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center gap-3 animate-fade-in max-w-md">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
          <p className="font-semibold">{toastMessage}</p>
        </div>
      )}

      {/* Main Top Header with Authenticated Profile & Logout */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
                <HardHat className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-slate-950">
                    ObraService
                  </span>
                  {isCloudSynced && (
                    <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                      <CloudCheck className="w-3 h-3 text-emerald-600" />
                      Cloud Sync
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-semibold block -mt-0.5">
                  Control Diario & Digital de Albaranes de Subcontratas
                </span>
              </div>
            </div>

            {/* Authenticated User Status & Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={async () => {
                  const sharedUrl = 'https://ais-pre-wgmrqfn3b4mcr7py5bbl7i-828288345083.europe-west2.run.app';
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: 'ObraService',
                        text: 'Accede a ObraService para ver y gestionar los partes de obra en tiempo real:',
                        url: sharedUrl,
                      });
                      return;
                    } catch {
                      // fallback to clipboard if share cancelled
                    }
                  }
                  try {
                    await navigator.clipboard.writeText(sharedUrl);
                    showToast('Enlace de acceso compartido copiado al portapapeles.');
                  } catch {
                    showToast(`Comparte este enlace: ${sharedUrl}`);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors shadow-xs cursor-pointer"
                title="Copiar enlace para compartir con tu compañero"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-800" />
                <span className="hidden md:inline">Compartir Link</span>
              </button>

              <PWAInstallButton compact />

              {/* Role & Name Badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-slate-50 text-xs">
                <RoleIcon className="w-4 h-4 text-slate-700 shrink-0" />
                <div className="text-left">
                  <span className="font-bold text-slate-900 block leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block truncate max-w-[200px]">
                    {currentRoleInfo.title}
                  </span>
                </div>
              </div>

              {/* Cerrar Sesión Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 transition-colors shadow-xs cursor-pointer"
                title="Cerrar Sesión para cambiar de usuario"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-600" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Viewport Content strictly restricted to currentUser.role */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ROL 1: ENCARGADO DE OBRA */}
        {currentUser.role === 'encargado' && (
          <EncargadoQuickView
            obras={obras}
            subcontratas={subcontratas}
            workers={workers}
            albaranes={albaranes}
            onSaveAlbaran={handleSaveAlbaran}
            onRectifyAlbaran={handleRectifyAlbaran}
            onViewAlbaranDetail={(alb) => setSelectedAlbaranForModal(alb)}
            onOpenResumenAcumulado={(obraId) => {
              setResumenPreselectedObraId(obraId);
              setIsResumenAcumuladoOpen(true);
            }}
          />
        )}

        {/* ROL 2: SUBCONTRATA */}
        {currentUser.role === 'subcontrata' && (
          <SubcontrataPortalView
            subcontrata={userSubcontrata}
            obras={obras}
            workers={workers}
            albaranes={albaranes}
            onAddWorker={handleAddWorker}
            onDeleteWorker={handleDeleteWorker}
            onValidateAlbaran={handleValidateAlbaran}
            onViewAlbaranDetail={(alb) => setSelectedAlbaranForModal(alb)}
            onOpenResumenAcumulado={(obraId) => {
              setResumenPreselectedObraId(obraId);
              setIsResumenAcumuladoOpen(true);
            }}
          />
        )}

        {/* ROL 3: JEFE DE OBRA */}
        {currentUser.role === 'jefe_obra' && (
          <JefeObraApprovalView
            obras={obras}
            subcontratas={subcontratas}
            albaranes={albaranes}
            onFinalApproveAlbaran={handleFinalApproveAlbaran}
            onViewAlbaranDetail={(alb) => setSelectedAlbaranForModal(alb)}
            onOpenResumenAcumulado={(obraId) => {
              setResumenPreselectedObraId(obraId);
              setIsResumenAcumuladoOpen(true);
            }}
          />
        )}

        {/* ROL 4: CONSTRUCTORA */}
        {currentUser.role === 'constructora' && (
          <ConstructoraAdminView
            obras={obras}
            subcontratas={subcontratas}
            staff={staff}
            albaranes={albaranes}
            onCreateObra={handleCreateObra}
            onAddSubcontrata={handleAddSubcontrata}
            onAddStaff={handleAddStaff}
            onViewAlbaranDetail={(alb) => setSelectedAlbaranForModal(alb)}
            onOpenResumenAcumulado={(obraId) => {
              setResumenPreselectedObraId(obraId);
              setIsResumenAcumuladoOpen(true);
            }}
          />
        )}
      </main>

      {/* Modal de Resumen y Hoja Acumulada de Unidades (Oficiales vs Peones por Rango de Fechas) */}
      {isResumenAcumuladoOpen && (
        <ResumenAcumuladoModal
          obras={obras}
          subcontratas={subcontratas}
          albaranes={albaranes}
          initialObraId={resumenPreselectedObraId}
          initialSubcontrataId={currentUser.subcontrataId}
          userRole={currentUser.role}
          currentUserName={currentUser.name}
          onClose={() => setIsResumenAcumuladoOpen(false)}
          onViewAlbaranDetail={(alb) => setSelectedAlbaranForModal(alb)}
        />
      )}

      {/* Detailed Modal for viewing/printing any albarán */}
      {selectedAlbaranForModal && (
        <AlbaranDetailModal
          albaran={selectedAlbaranForModal}
          onClose={() => setSelectedAlbaranForModal(null)}
          onValidateSubcontrata={
            currentUser.role === 'subcontrata'
              ? (id, sigUrl, comments) => {
                  handleValidateAlbaran(
                    id,
                    true,
                    `${currentUser.name} (${userSubcontrata?.companyName || currentUser.companyName})`,
                    comments,
                    sigUrl
                  );
                  setSelectedAlbaranForModal(null);
                }
              : undefined
          }
          onApproveJefeObra={
            currentUser.role === 'jefe_obra' || currentUser.role === 'constructora'
              ? (id, sigUrl, comments) => {
                  handleFinalApproveAlbaran(
                    id,
                    `${currentUser.name} (Jefe de Obra)`,
                    comments,
                    sigUrl
                  );
                  setSelectedAlbaranForModal(null);
                }
              : undefined
          }
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-extrabold text-slate-900">ObraService</span> · Sesión iniciada como{' '}
            <span className="font-bold text-slate-800">{currentUser.name}</span> ({currentRoleInfo.title})
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Sincronización Cloud Firestore en Tiempo Real</span>
            <span aria-hidden="true">·</span>
            <span>Segregación Estricta por Perfil</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
