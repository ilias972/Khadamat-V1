'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { ProsFilters } from '@/components/pros/pros-filters';
import { ProsResultSummary } from '@/components/pros/pros-result-summary';
import { ProsGrid } from '@/components/pros/pros-grid';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useProfessionals, type ProsFiltersState } from '@/hooks/use-professionals';

type CityOption = { id: string; name: string };
type CategoryOption = { id: string; name: string };

const FALLBACK_CITIES: CityOption[] = [
  { id: 'casablanca', name: 'Casablanca' },
  { id: 'rabat', name: 'Rabat' },
  { id: 'marrakech', name: 'Marrakech' },
  { id: 'tanger', name: 'Tanger' },
  { id: 'agadir', name: 'Agadir' },
  { id: 'fes', name: 'Fes' },
  { id: 'kenitra', name: 'Kenitra' },
  { id: 'oujda', name: 'Oujda' },
  { id: 'meknes', name: 'Meknes' },
  { id: 'tetouan', name: 'Tetouan' },
  { id: 'essaouira', name: 'Essaouira' },
];

const FALLBACK_CATEGORIES: CategoryOption[] = [
  { id: 'plomberie', name: 'Plomberie' },
  { id: 'electricite', name: 'Electricite' },
  { id: 'menage', name: 'Menage' },
  { id: 'peinture', name: 'Peinture' },
  { id: 'maconnerie', name: 'Maconnerie' },
  { id: 'jardinage', name: 'Jardinage' },
  { id: 'climatisation', name: 'Climatisation' },
  { id: 'menuiserie', name: 'Menuiserie' },
  { id: 'nettoyage', name: 'Nettoyage industriel' },
  { id: 'depannage', name: 'Depannage' },
];

type OptionLike = { id?: string | number; name?: string };

const normalizeOptions = (raw: unknown): { id: string; name: string }[] => {
  const collection =
    (Array.isArray(raw) && raw) ||
    (raw as { items?: unknown })?.items ||
    (raw as { data?: unknown })?.data ||
    (raw as { cities?: unknown })?.cities ||
    (raw as { categories?: unknown })?.categories ||
    [];

  if (!Array.isArray(collection)) return [];

  return collection
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const option = item as OptionLike;
      const id = option.id ? option.id.toString() : '';
      const name = option.name || id;
      return id && name ? { id, name } : null;
    })
    .filter((item): item is { id: string; name: string } => Boolean(item));
};

function ProsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState<ProsFiltersState>({
    cityId: searchParams.get('cityId') || '',
    categoryId: searchParams.get('categoryId') || '',
    search: searchParams.get('search') || '',
    minRating: searchParams.get('rating') ? parseFloat(searchParams.get('rating')!) : undefined,
    verified: searchParams.get('verified') === 'true',
    premium: searchParams.get('premium') === 'true',
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
  });

  const [cities, setCities] = useState<CityOption[]>(FALLBACK_CITIES);
  const [categories, setCategories] = useState<CategoryOption[]>(FALLBACK_CATEGORIES);
  const [showFilters, setShowFilters] = useState(false);

  const { professionals, pagination, isLoading } = useProfessionals(filters);

  useEffect(() => {
    let isMounted = true;

    const fetchOptions = async () => {
      try {
        const [citiesRes, categoriesRes] = await Promise.allSettled([
          api.getCities(),
          api.getCategories(),
        ]);

        if (!isMounted) return;

        if (citiesRes.status === 'fulfilled') {
          const normalizedCities = normalizeOptions(citiesRes.value);
          if (normalizedCities.length) setCities(normalizedCities);
        }

        if (categoriesRes.status === 'fulfilled') {
          const normalizedCategories = normalizeOptions(categoriesRes.value);
          if (normalizedCategories.length) setCategories(normalizedCategories);
        }
      } catch (error) {
        console.warn('Impossible de charger les filtres dynamiques, utilisation des valeurs de secours.', error);
      }
    };

    fetchOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update filters when URL params change
  useEffect(() => {
    const cityId = searchParams.get('cityId');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const rating = searchParams.get('rating');
    const verified = searchParams.get('verified');
    const premium = searchParams.get('premium');
    const page = searchParams.get('page');

    const nextFilters: ProsFiltersState = {
      cityId: cityId || '',
      categoryId: categoryId || '',
      search: search || '',
      minRating: rating ? parseFloat(rating) : undefined,
      verified: verified === 'true',
      premium: premium === 'true',
      page: page ? parseInt(page) : 1,
    };

    // Keep URL as the source of truth while avoiding unnecessary renders
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters((prev) => {
      const isSame =
        prev.cityId === nextFilters.cityId &&
        prev.categoryId === nextFilters.categoryId &&
        prev.search === nextFilters.search &&
        prev.minRating === nextFilters.minRating &&
        prev.verified === nextFilters.verified &&
        prev.premium === nextFilters.premium &&
        prev.page === nextFilters.page;

      return isSame ? prev : nextFilters;
    });
  }, [searchParams]);

  const handleFiltersChange = (newFilters: Partial<ProsFiltersState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    if (newFilters.page === undefined) {
      updatedFilters.page = 1;
    }
    setFilters(updatedFilters);

    // Update URL params
    const params = new URLSearchParams();
    if (updatedFilters.cityId) params.set('cityId', updatedFilters.cityId);
    if (updatedFilters.categoryId) params.set('categoryId', updatedFilters.categoryId);
    if (updatedFilters.search) params.set('search', updatedFilters.search);
    if (updatedFilters.minRating) params.set('rating', updatedFilters.minRating.toString());
    if (updatedFilters.verified) params.set('verified', 'true');
    if (updatedFilters.premium) params.set('premium', 'true');
    if (updatedFilters.page && updatedFilters.page > 1) params.set('page', updatedFilters.page.toString());

    const newUrl = `/pros${params.toString() ? '?' + params.toString() : ''}`;
    router.replace(newUrl, { scroll: false });
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
    });
    router.replace('/pros', { scroll: false });
  };

  // Create filter summary for result summary
  const getActiveFiltersSummary = () => {
    const parts: string[] = [];
    if (filters.cityId) {
      const city = cities.find((c) => c.id === filters.cityId);
      if (city) parts.push(city.name);
    }
    if (filters.categoryId) {
      const category = categories.find((c) => c.id === filters.categoryId);
      if (category) parts.push(category.name);
    }
    if (filters.minRating) parts.push(`Note >= ${filters.minRating}`);
    if (filters.verified) parts.push('Pros verifies');
    if (filters.premium) parts.push('Pros premium');

    return parts;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-16">
        {/* Main Content */}
        <section className="pb-16">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-4 gap-8">
              {/* Desktop Filters Sidebar */}
              <aside className="lg:col-span-1">
                <div className="sticky top-24">
                  <div className="bg-gradient-to-br from-[rgba(250,247,242,0.8)] to-[rgba(255,255,255,0.5)] backdrop-blur-sm rounded-[24px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                    <ProsFilters
                      filters={filters}
                      onFiltersChange={handleFiltersChange}
                      onClearFilters={clearFilters}
                      cities={cities}
                      categories={categories}
                    />
                  </div>
                </div>
              </aside>

              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Mobile Filters Toggle */}
                <div className="lg:hidden mb-6">
                  <Button
                    onClick={() => setShowFilters(true)}
                    className="w-full bg-[#EDEEEF] hover:bg-[#F97B22]/10 text-text-primary rounded-[24px] py-3 font-semibold transition-all duration-200"
                  >
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Filtres
                  </Button>
                </div>

                {/* Result Summary */}
                <ProsResultSummary
                  totalResults={pagination?.total || 0}
                  activeFilters={getActiveFiltersSummary()}
                  onClearFilters={clearFilters}
                />

                {/* Professionals Grid */}
                <ProsGrid
                  professionals={professionals}
                  isLoading={isLoading}
                  isUsingMocks={false}
                  onPageChange={(page: number) => handleFiltersChange({ page })}
                  currentPage={pagination?.page || 1}
                  totalPages={pagination?.totalPages || 1}
                />

                {/* Bottom CTA */}
                <div className="text-center mt-16">
                  <div className="bg-gradient-to-br from-[rgba(250,247,242,0.8)] to-[rgba(255,255,255,0.5)] backdrop-blur-sm rounded-[24px] p-8 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-h3 font-semibold text-text-primary mb-4 font-heading">
                      Vous etes artisan ?
                    </h3>
                    <p className="text-body text-text-secondary mb-6 font-body">
                      Rejoignez Khadamat et developpez votre activite en ligne.
                    </p>
                    <Button
                      onClick={() => router.push('/devenir-pro')}
                      className="bg-[#F97B22] hover:bg-[#e66a1f] text-white rounded-[24px] px-8 py-3 font-semibold transition-all duration-200 hover:shadow-lg"
                    >
                      Devenir professionnel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Filters Modal */}
        {showFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowFilters(false)} />
            <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-background shadow-xl">
              <div className="flex items-center justify-between p-4 border-b border-border-light">
                <h3 className="text-lg font-semibold text-text-primary">Filtres</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-surface rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <ProsFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onClearFilters={clearFilters}
                  cities={cities}
                  categories={categories}
                />
                <div className="mt-6">
                  <Button
                    onClick={() => setShowFilters(false)}
                    className="w-full"
                  >
                    Appliquer les filtres
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="animate-pulse space-y-8">
              <div className="h-8 bg-surface rounded w-1/3"></div>
              <div className="h-12 bg-surface rounded w-full"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-64 bg-surface rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    }>
      <ProsPageContent />
    </Suspense>
  );
}
