'use client';

import React, { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { ServiceGrid } from '@/components/services/service-grid';
import { ServiceFilters as ServiceFiltersComponent } from '@/components/services/service-filters';
import { useServiceFilters } from '@/hooks/useServiceFilters';

const ServicesPageContent = () => {
  const { filters, setFilters, resetFilters } = useServiceFilters();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-16">
        <section className="relative py-12 md:py-16">
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-primary-200/20 to-primary-300/15 rounded-full mix-blend-multiply filter blur-3xl opacity-60"></div>
            <div className="absolute top-40 right-10 w-80 h-80 bg-gradient-to-br from-secondary-300/20 to-primary-500/15 rounded-full mix-blend-multiply filter blur-3xl opacity-60"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.02)_1px,transparent_0)] bg-[length:24px_24px] opacity-20"></div>
          </div>

          <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-h1 font-bold text-text-primary leading-tight tracking-tight font-heading mb-4">
                Tous les services disponibles sur Khadamat
              </h1>
              <p className="text-body text-text-secondary leading-relaxed font-body mb-8 max-w-2xl mx-auto">
                DAccouvrez les services proposAcs et trouvez un professionnel dans votre ville.
              </p>
            </div>
          </div>
        </section>

        <section className="py-8 bg-gradient-to-br from-[rgba(250,247,242,0.8)] to-[rgba(255,255,255,0.5)] backdrop-blur-sm">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-4 gap-8">
              <aside className="lg:col-span-1">
                <div className="sticky top-24">
                  <ServiceFiltersComponent
                    filters={filters}
                    onFiltersChange={setFilters}
                    onClearFilters={resetFilters}
                  />
                </div>
              </aside>

              <div className="lg:col-span-3">
                <ServiceGrid filters={filters} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default function ServicesPage() {
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
      <ServicesPageContent />
    </Suspense>
  );
}
