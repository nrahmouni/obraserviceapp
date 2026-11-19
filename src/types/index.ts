export type UserRole = 'constructora' | 'jefe_obra' | 'encargado' | 'subcontrata';

export type PlanTier = 'free_trial' | 'subcontrata_pro' | 'constructora_starter' | 'constructora_enterprise';

export interface SubscriptionPlan {
  id: PlanTier;
  name: string;
  targetRole: 'subcontrata' | 'constructora' | 'all';
  priceMonthly: number;
  priceAnnualMonthly: number; // e.g. discounted if annual
  features: string[];
  maxObras: number; // -1 for unlimited
  maxSubcontratas: number; // -1 for unlimited
  maxOperarios: number; // -1 for unlimited
  pdfExport: boolean;
  prioritySupport: boolean;
  popular?: boolean;
}

export interface CompanySubscription {
  planId: PlanTier;
  planName: string;
  status: 'trial' | 'active' | 'past_due' | 'canceled';
  billingCycle: 'monthly' | 'annual';
  currentPeriodEnd: string;
  trialDaysRemaining?: number;
  stripeCustomerId?: string;
  autoRenew: boolean;
  invoicesCount: number;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  companyName: string;
  subcontrataId?: string; // If user belongs to a subcontrata
  assignedProjectIds: string[]; // Projects they supervise or work on
  emailVerified?: boolean;
  subscription?: CompanySubscription;
}

export interface PendingRegistration {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName: string;
  subcontrataId?: string;
  subTrade?: string;
  subCif?: string;
  verificationCode: string;
  createdAt: string;
}

export interface Worker {
  id: string;
  subcontrataId: string;
  subcontrataName: string;
  name: string;
  dni: string;
  category: 'Oficial 1ª' | 'Oficial 2ª' | 'Peón Especialista' | 'Peón Ordinario' | 'Encargado Subcontrata';
  phone?: string;
  active: boolean;
}

export interface Subcontrata {
  id: string;
  companyName: string;
  cif: string;
  trade: string; // e.g. 'Encofrados y Estructuras', 'Pladur y Tabiquería', 'Fontanería', 'Electricidad'
  contactPerson: string;
  phone: string;
  email: string;
  hourlyRateStandard: number; // e.g. 22 €/h
  assignedProjectIds: string[];
}

export interface AlbaranWorkerLine {
  workerId: string;
  workerName: string;
  workerCategory: string;
  hours: number;
  extraHours?: number;
  taskDescription?: string;
}

export type AlbaranStatus =
  | 'pendiente_subcontrata' // Creado por encargado, esperando visto bueno de la subcontrata
  | 'validado_subcontrata'  // Validado por subcontrata, esperando aprobación final del jefe de obra
  | 'aprobado_final'        // Aprobado por el jefe de obra de la constructora
  | 'observado';           // Con discrepancias reportadas

export interface AlbaranDiario {
  id: string;
  albaranNumber: string; // e.g. 'ALB-2026-0038'
  projectId: string;
  projectTitle: string;
  subcontrataId: string;
  subcontrataName: string;
  date: string;
  createdAt: string;

  // Paso 1: Encargado de obra
  createdByEncargadoId: string;
  createdByEncargadoName: string;
  workers: AlbaranWorkerLine[];
  totalHours: number;
  generalNotes: string;
  tajoZone?: string; // e.g. 'Planta 3ª - Forjado Bloque B'
  photoUrl?: string;
  encargadoSignature?: string;

  // Estado del flujo
  status: AlbaranStatus;

  // Paso 2: Validación por Subcontrata
  subcontrataReview?: {
    approved: boolean;
    date: string;
    reviewedBy: string;
    comments?: string;
    signature?: string;
  };

  // Paso 3: Aprobación final por Jefe de Obra (Constructora)
  jefeObraApproval?: {
    approved: boolean;
    date: string;
    approvedBy: string;
    comments?: string;
    signature?: string;
  };

  // Rectificación posterior por el Encargado
  rectification?: {
    rectifiedAt: string;
    rectifiedBy: string;
    reason: string;
    previousTotalHours: number;
    previousStatus: AlbaranStatus;
  };
}

export interface ObraProject {
  id: string;
  code: string;
  title: string;
  address: string;
  city: string;
  startDate: string;
  status: 'activa' | 'en_garantia' | 'finalizada';
  jefeObraId: string;
  jefeObraName: string;
  encargadoId: string;
  encargadoName: string;
  subcontrataIds: string[];
  coverImage?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'jefe_obra' | 'encargado';
  phone: string;
  email: string;
  activeProjectsCount: number;
}
