import { Professional } from '@/lib/mocks/services-mocks';

export interface ProsFiltersState {
  cityId?: string;
  categoryId?: string;
  search?: string;
  minRating?: number;
  verified?: boolean;
  premium?: boolean;
  page?: number;
  limit?: number;
}

export declare const useProfessionals: (filters: ProsFiltersState) => {
  professionals: Professional[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  isLoading: boolean;
};
