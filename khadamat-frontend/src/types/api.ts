export type Role = 'CLIENT' | 'PRO' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  phone?: string;
  clientProfile?: ClientProfile;
  proProfile?: ProProfile;
}

// ✅ CORRECTION : L'enum manquant (Indispensable pour le dashboard)
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export interface SignupDto {
  email: string;
  password: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string;
  profession?: string;
  bio?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
}

export interface AuthResponse {
  user: User;
  access_token?: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
}

// Type pour les statistiques (pour corriger le +0 Pros)
export interface PlatformStats {
  totalPros: number;
  totalClients: number;
  totalBookings: number;
  averageRating: number;
}

export interface ProProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  profession: string;
  bio?: string;
  experienceYears?: number;
  isVerified: boolean;
  isPremium: boolean;
  rating?: number;
  reviewCount?: number;
  cityId?: string;
  city?: City;
  services?: ProService[];
  avatarUrl?: string;
  phone?: string;
  email?: string;
}

export interface ClientProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
}

export interface City {
  id: string;
  name: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
}

export interface ProService {
  id: string;
  proId: string;
  categoryId: string;
  category: ServiceCategory;
  title: string;
  description: string;
  price: number;
  duration?: number;
  isActive: boolean;
}

export interface Booking {
  id: string;
  clientId: string;
  proId: string;
  serviceId: string;
  status: BookingStatus;
  description: string;
  scheduledDate?: string;
  timeSlot?: string;
  priceEstimate?: number;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
  client?: User;
  pro?: ProProfile;
  service?: ProService;
}
