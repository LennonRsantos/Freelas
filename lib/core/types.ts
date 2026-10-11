// Domain types. Plain TypeScript with no React or DOM imports,
// so this folder can be shared with a future React Native / Expo app.

import type { Role } from "./roles";

export { ROLES, type Role } from "./roles";

export type ViewMode = "freelancer" | "contratante";

export interface Address {
  cep: string; // 00000-000
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string; // UF
}

export interface FreelancerProfile {
  fullName: string;
  photoUrl?: string;
  phone: string;
  cpf: string;
  specialties: Role[];
  bio: string;
  pixKey: string;
  /** Where the freelancer leaves from. Required; optional in the type only
   * because profiles saved before this field existed lack it. */
  address?: Address;
}

export interface ContratanteProfile {
  businessName: string;
  document: string; // CNPJ ou CPF
  manager: string;
  /** Default address for new jobs. Profiles saved before addresses were
   * looked up by CEP hold a plain string; those must be updated. */
  address: Address | string;
  logoUrl?: string;
}

export interface User {
  id: string;
  email: string;
  freelancer?: FreelancerProfile;
  contratante?: ContratanteProfile;
}

/** Public data of a freelancer, as a contractor sees it. */
export interface FreelancerCard {
  id: string;
  name: string;
  photoUrl?: string;
  specialties: Role[];
  /** Neighborhood and city the freelancer leaves from. The full address stays private. */
  homeArea: string;
  rating: number; // 0–5
  ratingCount: number;
  attendanceRate: number | null; // 0–100; null = no finished shifts yet
}

export interface Contractor {
  id: string;
  name: string;
  logoUrl?: string;
  rating: number;
  ratingCount: number;
}

export type JobStatus = "aberta" | "preenchida" | "encerrada" | "cancelada";

/** A job carries its full address (from ViaCEP) plus coordinates for check-in. */
export interface Job extends Address {
  id: string;
  contractorId: string;
  role: Role;
  slots: number;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string; // HH:mm
  pay: number; // R$: taxa paga por profissional no turno
  lat: number;
  lng: number;
  dressCode: string;
  notes?: string;
  status: JobStatus;
  createdAt: string; // ISO
}

export type ApplicationStatus =
  | "em_analise"
  | "confirmada"
  | "recusada"
  | "concluida"
  | "cancelada";

export interface Application {
  id: string;
  jobId: string;
  freelancerId: string;
  status: ApplicationStatus;
  appliedAt: string;
  checkInAt?: string;
  /** Set when a confirmed shift is called off, by either side. */
  cancelledBy?: ViewMode;
  cancelledAt?: string;
  /** Rating given by the contractor to the freelancer. */
  contractorReview?: Review;
  /** Rating given by the freelancer to the contractor. */
  freelancerReview?: Review;
}

export interface Review {
  stars: number; // 1–5
  tags: string[];
  /** Short written comment, required on new reviews (see REVIEW_COMMENT).
   * Optional in the type because reviews saved before it existed lack it. */
  comment?: string;
  createdAt: string;
}

export const REVIEW_COMMENT = { min: 10, max: 280 } as const;

export const FREELANCER_TAGS = [
  "Pontual",
  "Organizado",
  "Proativo",
  "Traje correto",
  "Simpático",
  "Ágil",
];

export const CONTRACTOR_TAGS = [
  "Pagou em dia",
  "Bem organizado",
  "Equipe acolhedora",
  "Refeição oferecida",
  "Briefing claro",
  "Local fácil de achar",
];
