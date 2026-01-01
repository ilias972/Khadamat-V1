'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const getCityMapImage = (cityName: string) => {
  const imageMap: Record<string, string> = {
    Casablanca: '/casablancaMAP.jpeg',
    Rabat: '/rabatMAP.jpeg',
    Marrakech: '/marrakechMAP.jpeg',
    Fes: '/fesMAP.jpeg',
    Tanger: '/tangerMAP.jpeg',
    Agadir: '/agadirMAP.jpeg',
    Kenitra: '/kenitraMAP.jpeg',
    Oujda: '/oujdaMAP.jpeg',
    Meknes: '/meknesMAP.jpeg',
    Tetouan: '/tangerMAP.jpeg',
    Essaouira: '/essaouiraMAP.jpeg',
  };
  return imageMap[cityName] || '/casablancaMAP.jpeg';
};

const mockCities = [
  { id: 'casablanca', name: 'Casablanca' },
  { id: 'rabat', name: 'Rabat' },
  { id: 'marrakech', name: 'Marrakech' },
  { id: 'fes', name: 'Fes' },
  { id: 'tanger', name: 'Tanger' },
  { id: 'agadir', name: 'Agadir' },
  { id: 'kenitra', name: 'Kenitra' },
  { id: 'oujda', name: 'Oujda' },
  { id: 'meknes', name: 'Meknes' },
  { id: 'tetouan', name: 'Tetouan' },
  { id: 'essaouira', name: 'Essaouira' },
];

type CityItem = { id: string; slug: string; name: string; imageSrc: string };

export const ServicesByCity: React.FC = () => {
  const [cities, setCities] = useState<CityItem[]>([]);

  useEffect(() => {
    const next = mockCities.map((c) => {
      const slug = (c.id || c.name).toString().trim().toLowerCase();
      return { ...c, slug, imageSrc: getCityMapImage(c.name) };
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCities(next);
  }, []);

  return (
    <section className="py-24 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/40 backdrop-blur-xl border border-white/40 shadow-2xl rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-heading">
              Services par ville
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-body">
              Des milliers de professionnels vous attendent partout au Maroc.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {cities.map((city) => (
              <Link
                key={city.id}
                href={`/pros?cityId=${city.slug}`}
                className="group block"
              >
                <div className="relative h-64 rounded-3xl overflow-hidden cursor-pointer ring-1 ring-inset ring-black/5 transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(${city.imageSrc})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90" />
                  <div className="absolute inset-0 flex flex-col items-center justify-end p-6 text-center z-10">
                    <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                      <MapPin className="w-6 h-6 text-gray-800" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1 drop-shadow-md">{city.name}</h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link href="/services">
              <motion.button
                className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 hover:bg-orange-600 text-white font-medium rounded-full transition-all duration-300 shadow-lg"
                whileHover={{ scale: 1.05 }}
              >
                Voir toutes les villes <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
