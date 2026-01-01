'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle, Search, Wrench, Star, MapPin, Crown, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { ServiceFilters } from '@/hooks/useServiceFilters';
import { mockCategories } from '@/lib/mocks/services-mocks';

type ServiceItem = {
  id?: string;
  basePrice?: number;
  description?: string | null;
  serviceCategory?: { id?: string; name?: string };
  categoryId?: string;
  categoryName?: string;
  city?: { id?: string; name?: string };
  proProfile?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    isVerifiedPro?: boolean;
    isPremium?: boolean;
    averageRating?: number;
    totalReviews?: number;
  };
};

const resolveCategory = (service: ServiceItem) => ({
  id: service.serviceCategory?.id || service.categoryId || service.id || '',
  name: service.serviceCategory?.name || service.categoryName || 'Service',
});

const ServiceCard: React.FC<{ service: ServiceItem }> = ({ service }) => {
  const category = resolveCategory(service);
  const proName = [service.proProfile?.firstName, service.proProfile?.lastName].filter(Boolean).join(' ').trim();
  const initials =
    (proName || category.name)
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'SV';
  const rating = service.proProfile?.averageRating ?? 0;
  const totalReviews = service.proProfile?.totalReviews ?? 0;
  const isVerified = !!service.proProfile?.isVerifiedPro;
  const isPremium = !!service.proProfile?.isPremium;
  const cityName = service.city?.name;

  return (
    <div
      data-testid="service-tile"
      data-category-id={category.id}
      className="bg-gradient-to-br from-[rgba(250,247,242,0.8)] to-[rgba(255,255,255,0.5)] backdrop-blur-sm rounded-[24px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-[1.02] border-0 flex flex-col h-full"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 space-y-4">
          <div className="flex items-start space-x-3">
            <div className="relative w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-lg">
              <span>{service.proProfile ? initials : <Wrench className="w-6 h-6" />}</span>
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success-500 rounded-full flex items-center justify-center">
                  <Shield className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-h3 font-semibold text-text-primary truncate">
                {proName || category.name}
              </h3>
              <p className="text-body font-medium text-primary-600 mb-2">
                {category.name}
              </p>

              {service.proProfile && (
                <div className="flex items-center space-x-1 mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-warning-500 fill-current' : 'text-border-medium'}`}
                      />
                    ))}
                  </div>
                  <span className="text-small font-medium text-text-primary">
                    {rating.toFixed(1)}
                  </span>
                  <span className="text-small text-text-muted">
                    ({totalReviews} avis)
                  </span>
                </div>
              )}

              {cityName && (
                <div className="flex items-center text-small text-text-muted">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="truncate">{cityName}</span>
                </div>
              )}
            </div>
          </div>

          {isPremium && (
            <div className="flex items-center justify-center px-3 py-2 bg-gradient-to-r from-warning-50 to-warning-100 rounded-lg border border-warning-200">
              <Crown className="w-4 h-4 text-warning-600 mr-2" />
              <span className="text-sm font-medium text-warning-700">Artisan Premium</span>
            </div>
          )}

          {service.description && (
            <p className="text-small text-text-secondary line-clamp-2">
              {service.description}
            </p>
          )}

          {service.basePrice !== undefined && (
            <div className="text-center text-small text-text-muted">
              A partir de {service.basePrice} MAD
            </div>
          )}
        </div>

        <div className="flex pt-4 mt-auto">
          <Link
            data-testid="service-cta"
            href={`/pros?categoryId=${category.id}`}
            className="flex-1"
          >
            <Button className="w-full bg-[#F97B22] hover:bg-[#e66a1f] text-white rounded-[24px] py-2 font-semibold transition-all duration-200 hover:shadow-lg">
              Voir les pros
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

type ServiceGridProps = {
  filters: ServiceFilters;
};

const normalizeServices = (data: any): { services: ServiceItem[]; total: number } => {
  if (!data) return { services: [], total: 0 };
  if (Array.isArray(data)) return { services: data, total: data.length };
  if (data.services) {
    const arr = Array.isArray(data.services) ? data.services : [];
    const total = data.pagination?.total ?? arr.length ?? 0;
    return { services: arr, total };
  }
  if (data.items) {
    const arr = Array.isArray(data.items) ? data.items : [];
    const total = data.total ?? arr.length ?? 0;
    return { services: arr, total };
  }
  return { services: [], total: 0 };
};

export const ServiceGrid: React.FC<ServiceGridProps> = React.memo(({ filters }) => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [fallbackCategories, setFallbackCategories] = useState<any[]>(mockCategories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);

  const categoryCount = useMemo(() => services.length || fallbackCategories.length, [services.length, fallbackCategories.length]);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setRateLimitError(false);
    try {
      const response = await api.getServices(
        {
          categoryId: filters.categoryId,
          cityId: filters.cityId,
          minRating: filters.minRating,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          verified: filters.verified,
          premium: filters.premium,
          sort: filters.sort,
          order: filters.order,
          page: filters.page,
          limit: filters.limit,
        },
      );

      const normalized = normalizeServices(response);
      setServices(normalized.services);
      setFallbackCategories([]);
      setError(false);

      if ((!normalized.services || normalized.services.length === 0)) {
        const categories = await api.getCategories();
        const normalizedCategories = Array.isArray(categories)
          ? categories
          : categories?.categories || categories?.items || [];
        if (normalizedCategories.length === 0) {
          setFallbackCategories(mockCategories);
        } else {
          setFallbackCategories(normalizedCategories);
        }
      }
    } catch (err: any) {
      if (err?.response?.status === 429) {
        setRateLimitError(true);
        setError(false);
      } else {
        // fallback to categories to keep CTA usable
        setServices([]);
        try {
          const categories = await api.getCategories();
          const normalized = Array.isArray(categories)
            ? categories
            : categories?.categories || categories?.items || [];
          setFallbackCategories(normalized);
        } catch {
          setFallbackCategories(mockCategories);
        }
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  if (loading && services.length === 0 && fallbackCategories.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="bg-gradient-to-br from-[rgba(250,247,242,0.8)] to-[rgba(255,255,255,0.5)] backdrop-blur-sm rounded-[24px] p-8 shadow-[0_8px_24px_rgba(0,0,0,0.06)] animate-pulse"
          >
            <div className="space-y-4">
              <div className="w-20 h-20 bg-[#EDEEEF] rounded-[24px] mx-auto"></div>
              <div className="h-6 bg-[#EDEEEF] rounded w-24 mx-auto"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (rateLimitError) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-4 bg-warning-100 rounded-[24px] flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-warning-600" />
        </div>
        <h3 className="text-h3 font-semibold text-text-primary mb-2 font-heading">
          Trop de requAAÝtes
        </h3>
        <p className="text-text-secondary mb-6 font-body">
          Veuillez patienter un moment avant de rechercher AA¨ nouveau.
        </p>
        <Button
          onClick={() => fetchServices()}
          className="bg-[#EDEEEF] hover:bg-[#F97B22]/10 text-text-primary rounded-[24px] px-6 py-3 font-semibold transition-all duration-200"
        >
          RAcessayer
        </Button>
      </div>
    );
  }

  if (error && services.length === 0 && fallbackCategories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-4 bg-[#EDEEEF] rounded-[24px] flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-text-muted" />
        </div>
        <h3 className="text-h3 font-semibold text-text-primary mb-2 font-heading">
          Les services n'ont pas pu AAÝtre chargAcs
        </h3>
        <p className="text-text-secondary mb-6 font-body">
          Veuillez rAcessayer dans quelques instants.
        </p>
        <Button
          onClick={() => fetchServices()}
          className="bg-[#EDEEEF] hover:bg-[#F97B22]/10 text-text-primary rounded-[24px] px-6 py-3 font-semibold transition-all duration-200"
        >
          RAcessayer
        </Button>
      </div>
    );
  }

  const itemsToRender = services.length > 0 ? services : fallbackCategories;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F97B22]/10 border border-[#F97B22]/20 rounded-[16px] text-sm text-[#F97B22] font-medium">
          <span>{categoryCount} service{categoryCount !== 1 ? 's' : ''} trouvAc{categoryCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {itemsToRender.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-[#EDEEEF] to-[#F5F5F5] rounded-[32px] flex items-center justify-center shadow-lg">
            <Search className="w-16 h-16 text-text-muted" />
          </div>
          <h3 className="text-h3 font-semibold text-text-primary mb-3 font-heading">
            Aucun service trouvAc
          </h3>
          <p className="text-body text-text-secondary mb-8 font-body max-w-md mx-auto">
            Aucun service ne correspond AA¨ vos critA"res de recherche.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {itemsToRender.map((service: any) => (
            <ServiceCard key={service.id || service.serviceCategory?.id || service.categoryId} service={service} />
          ))}
        </div>
      )}
    </div>
  );
});
