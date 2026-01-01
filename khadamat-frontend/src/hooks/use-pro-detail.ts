import { useState, useEffect } from 'react';
import { ProfessionalDetail } from '@/lib/mocks/services-mocks';
import api from '@/lib/api-client';
import { transformProDetail } from '@/lib/api/transformers';

interface UseProDetailReturn {
  professional: ProfessionalDetail | null;
  isLoading: boolean;
  error: string | null;
}

export function useProDetail(id: string): UseProDetailReturn {
  const [professional, setProfessional] = useState<ProfessionalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfessional = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const found = await api.pro.getProById(id);
        const transformed = transformProDetail(found as any);
        setProfessional(transformed);
      } catch (err) {
        setError('Erreur lors du chargement du professionnel');
        setProfessional(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchProfessional();
    }
  }, [id]);

  return { professional, isLoading, error };
}
