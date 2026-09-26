// Shared value lists. Keep the spelling identical to server/config/constants.js
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

export const TOKEN_KEY = "findorm_token";

export const PAGE_SIZE = 12;

// Field limits from docs/data-model.md, used for client-side checks.
export const LIMITS = {
  name: [1, 50],
  password: [8, 72],
  listingName: [3, 100],
  address: [5, 200],
  longText: 2000,
  rent: [1, 100000],
  capacity: [1, 500],
  reservationMessage: 500,
  messageBody: 1000,
  photos: 10,
  photoBytes: 5 * 1024 * 1024,
};

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const PHONE_RE = /^09\d{9}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
