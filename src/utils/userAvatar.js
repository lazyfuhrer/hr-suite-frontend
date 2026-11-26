/**
 * Returns a usable profile image URL from a user/employee object, or null.
 */
export function getProfileImageUrl(entity) {
  if (!entity) return null;
  const url =
    entity.profile_image_url ??
    entity.profileImageUrl ??
    entity.employee?.profile_image_url ??
    entity.employee?.profileImageUrl;
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Derives display initials (max 2 chars, uppercase) from name fields.
 */
export function getUserInitials({ fullName, firstName, lastName } = {}) {
  if (firstName || lastName) {
    const fromParts = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.trim();
    if (fromParts) return fromParts.toUpperCase();
  }

  const name = (fullName || '').trim();
  if (!name || name === '-') return '?';

  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}
