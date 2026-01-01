import { permanentRedirect } from 'next/navigation';

function safeDecode(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

function normalizeCategoryId(slug: string): string {
  return safeDecode(slug)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\-_]/g, ''); // Remove special characters except - and _
}

export default function Page({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const trimmedSlug = slug.trim();
  if (!trimmedSlug) {
    permanentRedirect('/services');
  }
  const normalizedSlug = normalizeCategoryId(trimmedSlug);
  permanentRedirect(`/services?categoryId=${encodeURIComponent(normalizedSlug)}`);
}