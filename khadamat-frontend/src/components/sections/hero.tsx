'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Search, MapPin, Users, Shield, Star, Clock } from 'lucide-react';
import apiClientInstance from '@/lib/api-client';

type Option = { id: string; name: string };

const FALLBACK_CITIES: Option[] = [
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

const FALLBACK_CATEGORIES: Option[] = [
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

const normalizeOptions = (raw: unknown): Option[] => {
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
      const option = item as { id?: string | number; name?: string };
      const id = option.id ? option.id.toString() : '';
      const name = option.name || id;
      return id && name ? { id, name } : null;
    })
    .filter((item): item is Option => Boolean(item));
};

export function Hero() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const heroRef = useRef<HTMLDivElement | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [stats, setStats] = useState({ pros: 0, services: 0, cities: 0 });
  const [categories, setCategories] = useState<Option[]>(FALLBACK_CATEGORIES);
  const [cities, setCities] = useState<Option[]>(FALLBACK_CITIES);
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);

  // Animations Parallax
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const parallaxY1 = useTransform(
    scrollY,
    shouldReduceMotion ? [0, 0] : [0, 1000],
    shouldReduceMotion ? [0, 0] : [0, -100],
  );

  // Chargement des stats reelles
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await apiClientInstance.getPlatformStats();
        setStats({
          pros: response?.totalPros || 0,
          services: response?.totalServices || 0,
          cities: response?.totalCities || 0,
        });
      } catch (err) {
        console.error('Erreur stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Chargement des listes dynamiques (villes / categories)
  useEffect(() => {
    let isMounted = true;
    const fetchFilters = async () => {
      try {
        const [citiesRes, categoriesRes] = await Promise.allSettled([
          apiClientInstance.getCities(),
          apiClientInstance.getCategories(),
        ]);

        if (!isMounted) return;

        if (citiesRes.status === 'fulfilled') {
          const normalized = normalizeOptions(citiesRes.value);
          if (normalized.length) setCities(normalized);
        }
        if (categoriesRes.status === 'fulfilled') {
          const normalized = normalizeOptions(categoriesRes.value);
          if (normalized.length) setCategories(normalized);
        }
      } catch (error) {
        console.warn('Impossible de charger les filtres demarrage, fallback utilise.', error);
      } finally {
        if (isMounted) setLoadingFilters(false);
      }
    };

    fetchFilters();
    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronisation avec les params d'URL (coherence FE/BE)
  useEffect(() => {
    const categoryFromUrl = searchParams.get('categoryId');
    const cityFromUrl = searchParams.get('cityId');
    if (categoryFromUrl) setSelectedCategoryId(categoryFromUrl);
    if (cityFromUrl) setSelectedCityId(cityFromUrl);
  }, [searchParams]);

  // --- NAVIGATION VERS /PROS ---
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedCategoryId) params.append('categoryId', selectedCategoryId);
    if (selectedCityId) params.append('cityId', selectedCityId);

    router.push(`/pros${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <section ref={heroRef} className="relative min-h-[90vh] overflow-hidden bg-transparent" role="banner">
      {/* Animation Parallax (Bulle orange) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div className="absolute top-10 right-20" style={{ y: parallaxY1 }}>
          <svg width="200" height="200" viewBox="0 0 100 100" className="opacity-10 text-orange-500">
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </motion.div>
      </div>

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[70vh]">
          {/* GAUCHE : Textes & Recherche */}
          <div className="max-w-[640px] mx-auto lg:mx-0 z-10">
            <h1 className="text-6xl font-bold text-gray-900 leading-tight tracking-tight text-left mb-8 font-heading">
              Trouvez un artisan de confiance, pres de chez vous.
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed text-left mb-8">
              Plombiers, electriciens, femmes de menage, peintres et bien plus. Des professionnels verifies, locaux et
              evalues par des clients verifies.
            </p>

            {/* BARRE DE RECHERCHE */}
            <div className="mb-12">
              <form onSubmit={handleSearch}>
                {/* Mobile */}
                <div className="block md:hidden space-y-3">
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full p-4 rounded-2xl border bg-white/80 backdrop-blur-sm"
                  >
                    <option value="">{loadingFilters ? 'Chargement...' : 'Quel service ?'}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedCityId}
                    onChange={(e) => setSelectedCityId(e.target.value)}
                    className="w-full p-4 rounded-2xl border bg-white/80 backdrop-blur-sm"
                  >
                    <option value="">{loadingFilters ? 'Chargement...' : 'Quelle ville ?'}</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>

                  <button className="w-full p-4 bg-orange-600 text-white rounded-2xl shadow-lg font-bold">Chercher</button>
                </div>

                {/* Desktop (Pill Shape) */}
                <div className="hidden md:flex items-center bg-white shadow-2xl shadow-orange-500/10 rounded-full p-2 max-w-4xl border border-gray-100">
                  {/* Service */}
                  <div className="w-[45%] relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className="w-full pl-14 pr-4 py-4 bg-transparent border-0 text-gray-800 font-medium focus:ring-0 cursor-pointer appearance-none outline-none"
                    >
                      <option value="">{loadingFilters ? 'Chargement...' : 'Quel service ?'}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-px h-8 bg-gray-200 mx-2"></div>

                  {/* Ville */}
                  <div className="w-[40%] relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                    <select
                      value={selectedCityId}
                      onChange={(e) => setSelectedCityId(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-transparent border-0 text-gray-800 font-medium focus:ring-0 cursor-pointer appearance-none outline-none"
                    >
                      <option value="">{loadingFilters ? 'Chargement...' : 'Quelle ville ?'}</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bouton */}
                  <button
                    type="submit"
                    className="w-[15%] flex items-center justify-center py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-full transition-all duration-200 shadow-md transform hover:scale-105"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>

            {/* Stats */}
            <div className="mt-16 pt-8 border-t border-gray-200/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100/80 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">+1800</div>
                    <div className="text-sm text-gray-600">Clients</div>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-12 h-12 bg-green-100/80 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{loading ? '...' : `+${stats.pros}`}</div>
                    <div className="text-sm text-gray-600">Pros</div>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-12 h-12 bg-yellow-100/80 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-600 fill-current" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">4.8</div>
                    <div className="text-sm text-gray-600">Note</div>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-12 h-12 bg-orange-100/80 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">30 min</div>
                    <div className="text-sm text-gray-600">Reponse</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DROITE : Illustration */}
          <div className="relative flex justify-center lg:justify-end p-6 lg:p-8 pointer-events-none">
            <div className="relative z-0 lg:translate-x-8">
              <img
                src="/illustrationHOME.png"
                alt="Illustration"
                className="w-[90%] sm:w-[100%] max-w-[600px] h-auto object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
