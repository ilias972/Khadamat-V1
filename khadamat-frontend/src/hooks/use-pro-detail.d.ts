import { ProfessionalDetail } from '@/lib/mocks/services-mocks';
interface UseProDetailReturn {
    professional: ProfessionalDetail | null;
    isLoading: boolean;
    error: string | null;
}
export declare function useProDetail(id: string): UseProDetailReturn;
export {};
