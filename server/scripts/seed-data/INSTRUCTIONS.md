# Dorm scraping instructions (local-only student demo, never deployed)

Collect ~8 real, distinct dorms/boarding houses/bedspaces in your assigned AREA. Be token-efficient: prefer `curl -sL -A "Mozilla/5.0" URL | grep/sed` to pull just titles, prices and image URLs instead of reading whole pages; stop once you have ~8 good entries.

Sources: public pages only (dorm websites, Rentpad, Lamudi, Dormy PH, MyProperty, OLX/Carousell public pages, university housing pages, blog roundups). No Facebook/Instagram/login pages. If a site blocks you or shows a CAPTCHA, move on — never bypass. A few requests per site at most.

Tips from the first round: dorm.ph, suzyrent.com (Suzy Rent, formerly Dormy PH), moveinthecity.ph and dorms' own sites worked; Rentpad and Lamudi return 403 (skip them). Don't keep photos with phone numbers, names or other contact details printed on them. Don't reuse a dorm already in the other *.json files in this folder.

Each dorm → one JSON object:
```
{
  "name": "3–100 chars",
  "propertyType": "Dormitory" | "Boarding House",
  "city": exactly one of Caloocan, Las Piñas, Makati, Malabon, Mandaluyong, Manila, Marikina, Muntinlupa, Navotas, Parañaque, Pasay, Pasig, Pateros, Quezon City, San Juan, Taguig, Valenzuela,
  "address": "5–200 chars: street, barangay, landmark",
  "description": "2–4 sentences in your own words (don't copy page text)",
  "monthlyRent": integer pesos per bed per month (lowest if a range; per-room ÷ persons),
  "genderCategory": "Male" | "Female" | "Any",
  "amenities": subset of exactly WiFi, Air Conditioning, Electric Fan, Private Bathroom, Shared Bathroom, Kitchen Access, Laundry Area, Study Area, CCTV, Security Guard, Water Included, Electricity Included, Parking,
  "houseRules": "curfew/visitors etc., or \"\"",
  "capacity": integer 1–500,
  "availableSlots": integer 0..capacity,
  "estimatedFields": ["fields you guessed, e.g. capacity, availableSlots, genderCategory"],
  "sourceUrl": "page the data came from",
  "photos": ["images/<prefix>-<n>-1.jpg", ...]
}
```
name, city, address area and monthlyRent must be real (from the source). Skip dorms with no price.

Photos: up to 3 per dorm, real photos of that property. Download:
`curl -L -sS --max-time 30 -A "Mozilla/5.0" -o images/<prefix>-<n>-<k>.<ext> URL` (run from this folder; n = dorm number from 1, k = photo number). Check with `file`; delete anything not JPEG/PNG/WebP, under 10 KB, over 5 MB, or a logo/map/icon.

Output: JSON array at `<prefix>.json` in this folder. Validate with `node -e "JSON.parse(require('fs').readFileSync('<prefix>.json'))"`. Touch nothing else in the repo. Final reply: dorm count, photo count, problems — one short paragraph.
