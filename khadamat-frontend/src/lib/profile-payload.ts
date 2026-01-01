type ProfileInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  bio?: string;
  profession?: string;
  preferredLanguage?: string;
  cityId?: string;
};

const clean = (value?: string) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

/**
 * Normalize and whitelist profile update payload.
 * - trims strings
 * - drops empty fields
 * - only keeps allowed keys to avoid backend 400
 */
export function buildProfileUpdatePayload(input: ProfileInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const fields: (keyof ProfileInput)[] = [
    'firstName',
    'lastName',
    'phone',
    'address',
    'bio',
    'profession',
    'preferredLanguage',
    'cityId',
  ];

  for (const key of fields) {
    const cleaned = clean(input[key]);
    if (cleaned !== undefined) {
      payload[key] = cleaned;
    }
  }

  return payload;
}
