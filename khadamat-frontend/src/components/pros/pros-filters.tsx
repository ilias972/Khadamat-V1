'use client';

import React from 'react';
import { Search, MapPin, Star, RotateCcw, CheckCircle, Crown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { type ProsFiltersState } from '@/hooks/use-professionals';

type CityOption = { id: string; name: string };
type CategoryOption = { id: string; name: string };

interface ProsFiltersProps {
  filters: ProsFiltersState;
  onFiltersChange: (filters: Partial<ProsFiltersState>) => void;
  onClearFilters: () => void;
  cities: CityOption[];
  categories: CategoryOption[];
}

export function ProsFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  cities,
  categories,
}: ProsFiltersProps) {
  const handleRatingChange = (rating: number | null) => {
    onFiltersChange({ minRating: rating ?? undefined });
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-24">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Filtres</h2>
        <button
          onClick={onClearFilters}
          className="text-sm text-gray-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Réinitialiser
        </button>
      </div>

      <div className="space-y-6">
        {/* Recherche Texte */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Recherche</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Nom, service..."
              className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-all rounded-xl"
              value={filters.search ?? ''}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && onFiltersChange({ search: filters.search })}
            />
          </div>
        </div>

        {/* --- VILLE --- */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Ville</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filters.cityId ?? ''}
              onChange={(e) => onFiltersChange({ cityId: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer hover:bg-white appearance-none text-sm"
            >
              <option value="">Toutes les villes</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* --- SERVICE / CATÉGORIE --- */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Type de service</label>
          <select
            value={filters.categoryId ?? ''}
            onChange={(e) => onFiltersChange({ categoryId: e.target.value })}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer hover:bg-white appearance-none text-sm"
          >
            <option value="">Tous les services</option>
            {categories.map((service) => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Note Minimale */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">Note minimale</label>
          <div className="space-y-2">
            {[4.5, 4, 3.5, 3].map((rating) => (
              <label key={rating} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="rating"
                  checked={filters.minRating === rating}
                  onChange={() => handleRatingChange(filters.minRating === rating ? null : rating)}
                  className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                />
                <div className="flex items-center text-sm text-gray-600 group-hover:text-gray-900">
                  <span className="font-medium mr-1">Note ≥ {rating}</span>
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                </div>
              </label>
            ))}
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="rating"
                checked={!filters.minRating}
                onChange={() => handleRatingChange(null)}
                className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-600">Toutes les notes</span>
            </label>
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Checkboxes */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={!!filters.verified}
              onChange={(e) => onFiltersChange({ verified: e.target.checked })}
              className="mt-1 w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
            />
            <div>
              <div className="flex items-center gap-1.5 font-medium text-sm text-gray-900">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                Artisans vérifiés uniquement
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Profils vérifiés et assurés</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-orange-50/50 transition-colors">
            <input
              type="checkbox"
              checked={!!filters.premium}
              onChange={(e) => onFiltersChange({ premium: e.target.checked })}
              className="mt-1 w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
            />
            <div>
              <div className="flex items-center gap-1.5 font-medium text-sm text-gray-900">
                <Crown className="w-3.5 h-3.5 text-orange-500" />
                Artisans Premium uniquement
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Service haut de gamme</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
