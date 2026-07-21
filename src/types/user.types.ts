export type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN";
export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED";

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: Role;
  subscriptionStatus: SubscriptionStatus;
  avatarUrl?: string;
  createdAt?: string;
}

export interface InstructorProfile {
  id: string;
  licenseNumber: string;
  bio?: string;
  pricePerHour: number;
  ratingAvg: number;
  totalSessions: number;
  vehicleType: string;
  availableZones: string[];
  isVerified: boolean;
  isAvailable: boolean;
  nomCommercial?: string;
  adresse?: string;
  gouvernorat?: string;
  ville?: string;
  codePostal?: string;
  voitureMarque?: string;
  voitureModel?: string;
  voitureSerie?: string;
  voitureDateAchat?: string;
  voiturePhotos: string[];
  prixPermisB?: number;
  prixPermisA?: number;
  prixPermisC?: number;
  prixPermisD?: number;
  user?: {
    fullName: string;
    email: string;
    phone: string;
    avatarUrl?: string;
    facebook?: string;
    instagram?: string;
    website?: string;
  };
}
