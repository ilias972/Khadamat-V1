'use client';

import { useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export type ServiceFilters = {
  categoryId?: string;
  cityId?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  verified?: boolean;
  premium?: boolean;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
};

const parseBoolean = (value?: string | null) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const parseNumber = (value?: string | null) => {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
};

const buildSearchParams = (filters: ServiceFilters) => {
  const params = new URLSearchParams();
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.cityId) params.set('cityId', filters.cityId);
  if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating));
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.verified !== undefined) params.set('verified', String(filters.verified));
  if (filters.premium !== undefined) params.set('premium', String(filters.premium));
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.order) params.set('order', filters.order);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit && filters.limit !== 20) params.set('limit', String(filters.limit));
  return params;
};

const parseFilters = (sp: URLSearchParams): ServiceFilters => {
  return {
    categoryId: sp.get('categoryId') || undefined,
    cityId: sp.get('cityId') || undefined,
    minRating: parseNumber(sp.get('minRating')),
    minPrice: parseNumber(sp.get('minPrice')),
    maxPrice: parseNumber(sp.get('maxPrice')),
    verified: parseBoolean(sp.get('verified')),
    premium: parseBoolean(sp.get('premium')),
    sort: sp.get('sort') || undefined,
    order: sp.get('order') || undefined,
    page: parseNumber(sp.get('page')) || 1,
    limit: parseNumber(sp.get('limit')) || 20,
  };
};

export const useServiceFilters = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const setFilters = useCallback(
    (partial: Partial<ServiceFilters>) => {
      const next = { ...filters, ...partial };
      const params = buildSearchParams(next);
      const qs = params.toString();
      router.replace(qs ? `/services?${qs}` : '/services', { scroll: false });
    },
    [filters, router],
  );

  const resetFilters = useCallback(() => {
    router.replace('/services', { scroll: false });
  }, [router]);

  return { filters, setFilters, resetFilters };
};
