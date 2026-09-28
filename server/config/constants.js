// Shared value lists. Keep the spelling identical to client/src/lib/constants.js
// (docs/data-model.md → "Shared value lists").

export const ROLES = ["seeker", "owner", "admin"];

export const CITIES = [
  "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong", "Manila",
  "Marikina", "Muntinlupa", "Navotas", "Parañaque", "Pasay", "Pasig",
  "Pateros", "Quezon City", "San Juan", "Taguig", "Valenzuela",
];

export const PROPERTY_TYPES = ["Dormitory", "Boarding House"];

export const GENDER_CATEGORIES = ["Male", "Female", "Any"];

export const RESERVATION_STATUSES = ["Pending", "Accepted", "Rejected"];

export const AMENITIES = [
  "WiFi", "Air Conditioning", "Electric Fan", "Private Bathroom",
  "Shared Bathroom", "Kitchen Access", "Laundry Area", "Study Area", "CCTV",
  "Security Guard", "Water Included", "Electricity Included", "Parking",
];

export const MAX_PHOTOS = 10;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;
