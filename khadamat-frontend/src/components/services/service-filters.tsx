'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Star, Clock, RotateCcw, AlertCircle, DollarSign, Award, Crown } from 'lucide-react';
import { api } from '@/lib/api';
import { mockCities, mockCategories } from '@/lib/mocks/services-mocks';

interface ServiceFiltersProps {
  filters: {
    cityId?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    verified?: boolean;
    premium?: boolean;
    sort?: string;
    order?: string;
  };
  onFiltersChange: (filters: Partial<ServiceFiltersProps['filters']>) => void;
  onClearFilters: () => void;
}

export const ServiceFilters: React.FC<ServiceFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const [cities, setCities] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        setLoading(true);
        const [citiesData, categoriesData] = await Promise.all([
          api.getCities(),
          api.getCategories()
        ]);
        setCities(citiesData.filter((city: any) => city.isActive));
        setCategories(categoriesData.filter((cat: any) => cat.isActive));
        setError(false);
      } catch (err) {
        // Use mock data when API fails (no console error logging)
        setCities(mockCities);
        setCategories(mockCategories);
        setError(false); // Don't show error state, use mock data instead
      } finally {
        setLoading(false);
      }
    };

    loadFiltersData();
  }, []);

  return (
    <div className="bg-gradient-to-br from-[rgba(250,247,242,0.8)] to-[rgba(255,255,255,0.5)] backdrop-blur-sm rounded-[24px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-h3 font-semibold text-text-primary font-heading">Filtres</h3>
        <Button
          onClick={onClearFilters}
          className="text-text-muted hover:text-[#F97B22] bg-transparent hover:bg-[#F97B22]/10 rounded-[24px] px-4 py-2 font-medium transition-all duration-200"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Réinitialiser
        </Button>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-primary mb-3">
          Type de service
        </label>
        {loading ? (
          <div className="w-full h-12 bg-[#EDEEEF] rounded-[24px] animate-pulse"></div>
        ) : error ? (
          <div className="w-full px-4 py-3 bg-[#EDEEEF] border-0 rounded-[24px] text-text-muted flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            Impossible de charger les services
          </div>
        ) : (
          <select
            value={filters.categoryId || ''}
            onChange={(e) => onFiltersChange({ categoryId: e.target.value || undefined })}
            className="w-full px-4 py-3 bg-[#EDEEEF] border-0 rounded-[24px] text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all duration-200"
          >
            <option value="">Tous les services</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* City Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-primary mb-3">
          Ville
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
          {loading ? (
            <div className="w-full pl-12 pr-4 py-3 bg-[#EDEEEF] border-0 rounded-[24px] animate-pulse"></div>
          ) : error ? (
            <div className="w-full pl-12 pr-4 py-3 bg-[#EDEEEF] border-0 rounded-[24px] text-text-muted flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              Impossible de charger les villes
            </div>
          ) : (
            <select
              value={filters.cityId || ''}
              onChange={(e) => onFiltersChange({ cityId: e.target.value || undefined })}
              className="w-full pl-12 pr-4 py-3 bg-[#EDEEEF] border-0 rounded-[24px] text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all duration-200"
            >
              <option value="">Toutes les villes</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-primary mb-3">
          Prix (DH)
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              type="number"
              placeholder="Min"
              value={filters.minPrice || ''}
              onChange={(e) => onFiltersChange({ minPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
              className="pl-10 bg-[#EDEEEF] border-0 rounded-[24px] focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div className="relative flex-1">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              type="number"
              placeholder="Max"
              value={filters.maxPrice || ''}
              onChange={(e) => onFiltersChange({ maxPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
              className="pl-10 bg-[#EDEEEF] border-0 rounded-[24px] focus:ring-2 focus:ring-primary-300"
            />
          </div>
        </div>
      </div>

      {/* Rating Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-primary mb-3">
          Note minimum
        </label>
        <div className="relative">
          <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
          <select
            value={filters.minRating || ''}
            onChange={(e) => onFiltersChange({ minRating: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="w-full pl-12 pr-4 py-3 bg-[#EDEEEF] border-0 rounded-[24px] text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all duration-200"
          >
            <option value="">Toutes les notes</option>
            <option value="4.5">4.5+ étoiles</option>
            <option value="4.0">4.0+ étoiles</option>
            <option value="3.5">3.5+ étoiles</option>
            <option value="3.0">3.0+ étoiles</option>
          </select>
        </div>
      </div>

      {/* Verification & Premium */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-primary mb-3">
          Type d'artisan
        </label>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.verified || false}
              onChange={(e) => onFiltersChange({ verified: e.target.checked || undefined })}
              className="mr-3 w-4 h-4 text-[#F97B22] bg-[#EDEEEF] border-0 rounded focus:ring-[#F97B22]/30"
            />
            <Award className="w-4 h-4 mr-2 text-[#F97B22]" />
            <span className="text-sm font-medium">Artisans vérifiés</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.premium || false}
              onChange={(e) => onFiltersChange({ premium: e.target.checked || undefined })}
              className="mr-3 w-4 h-4 text-[#F97B22] bg-[#EDEEEF] border-0 rounded focus:ring-[#F97B22]/30"
            />
            <Crown className="w-4 h-4 mr-2 text-[#F97B22]" />
            <span className="text-sm font-medium">Artisans premium</span>
          </label>
        </div>
      </div>

      {/* Sort Options */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-primary mb-3">
          Trier par
        </label>
        <select
          value={`${filters.sort || 'rating'}:${filters.order || 'desc'}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split(':');
            onFiltersChange({ sort, order });
          }}
          className="w-full px-4 py-3 bg-[#EDEEEF] border-0 rounded-[24px] text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all duration-200"
        >
          <option value="rating:desc">Meilleures notes</option>
          <option value="price:asc">Prix croissant</option>
          <option value="price:desc">Prix décroissant</option>
          <option value="reviews:desc">Plus d'avis</option>
          <option value="date:desc">Plus récent</option>
        </select>
      </div>
    </div>
  );
};