/**
 * Loads demo data for presentations: 3 owners, 3 seekers, 7 listings in different
 * cities, reservation requests in every status, and an inquiry conversation.
 * Goes through the real API, so the server must be running on an empty database.
 * All demo accounts use the password Password123.
 *
 *   npm run seed-demo
 */
const B = process.env.API_URL || "http://localhost:5000/api";
const j = async (m, p, t, b) => {
  const r = await fetch(B + p, { method: m, headers: { "content-type": "application/json", ...(t ? { authorization: "Bearer " + t } : {}) }, body: b && JSON.stringify(b) });
  const x = r.status === 204 ? null : await r.json();
  if (r.status >= 400) throw new Error(`${m} ${p} ${r.status} ${JSON.stringify(x)}`);
  return x;
};
const reg = (firstName, lastName, role, email, phone) => j("POST", "/auth/register", null, { firstName, lastName, email, password: "Password123", role, phone });
const maria = await reg("Maria", "Santos", "owner", "maria@findorm.test", "09171234567");
const jose = await reg("Jose", "Reyes", "owner", "jose@findorm.test");
const liza = await reg("Liza", "Mendoza", "owner", "liza@findorm.test");
const juan = await reg("Juan", "Dela Cruz", "seeker", "juan@findorm.test", "09181112222");
const ana = await reg("Ana", "Lim", "seeker", "ana@findorm.test");
const carlo = await reg("Carlo", "Tan", "seeker", "carlo@findorm.test");
const L = (o, x) => j("POST", "/listings", o.token, x);
const casa = await L(maria, { name: "Casa Verde Dormitory", propertyType: "Dormitory", city: "Manila", address: "123 P. Noval St., Sampaloc (near UST)", description: "A quiet, all-female dormitory 5 minutes' walk from UST. Fully furnished bedspaces with study tables and lockers. 24/7 guard and CCTV.", monthlyRent: 4500, genderCategory: "Female", amenities: ["WiFi", "Study Area", "CCTV", "Security Guard", "Water Included", "Laundry Area"], houseRules: "Curfew 10 PM. No visitors in rooms. Quiet hours 10 PM – 6 AM. Keep common areas clean.", capacity: 20, availableSlots: 6 });
await L(maria, { name: "Dapitan Student Residence", propertyType: "Dormitory", city: "Manila", address: "45 Dapitan St., Sampaloc", description: "Mixed dorm with air-conditioned rooms for 4.", monthlyRent: 6500, genderCategory: "Any", amenities: ["WiFi", "Air Conditioning", "Shared Bathroom", "Kitchen Access", "CCTV"], houseRules: "Curfew 11 PM.", capacity: 16, availableSlots: 3 });
const pasig = await L(jose, { name: "Pasig Boarding House", propertyType: "Boarding House", city: "Pasig", address: "45 Caruncho Ave., San Nicolas", description: "Family-run boarding house near Pasig City Hall and the Ortigas jeepney route.", monthlyRent: 3200, genderCategory: "Any", amenities: ["Electric Fan", "Shared Bathroom", "Kitchen Access", "Water Included"], houseRules: "No smoking. Visitors until 8 PM only.", capacity: 8, availableSlots: 1 });
await L(jose, { name: "Kalayaan Men's Dorm", propertyType: "Dormitory", city: "Makati", address: "88 Kalayaan Ave., Poblacion", description: "For working men near the Makati CBD.", monthlyRent: 7000, genderCategory: "Male", amenities: ["WiFi", "Air Conditioning", "Private Bathroom", "Security Guard"], houseRules: "No alcohol inside.", capacity: 10, availableSlots: 0 });
await L(liza, { name: "Katipunan Ladies' Boarding House", propertyType: "Boarding House", city: "Quezon City", address: "12 Esteban Abada St., Loyola Heights", description: "Walking distance to Ateneo and Miriam. Bedspace and solo rooms.", monthlyRent: 5500, genderCategory: "Female", amenities: ["WiFi", "Study Area", "Laundry Area", "Kitchen Access"], houseRules: "Curfew 11 PM. No male visitors upstairs.", capacity: 12, availableSlots: 4 });
await L(liza, { name: "España Bedspace Hub", propertyType: "Boarding House", city: "Manila", address: "1450 España Blvd., Sampaloc", description: "Budget bedspaces along España, near FEU and UST.", monthlyRent: 2800, genderCategory: "Any", amenities: ["Electric Fan", "Shared Bathroom", "WiFi"], houseRules: "Curfew 12 MN.", capacity: 24, availableSlots: 9 });
await L(liza, { name: "Taguig BGC Shared Rooms", propertyType: "Dormitory", city: "Taguig", address: "5th Ave. cor. 26th St., Bonifacio Global City", description: "Shared rooms for young professionals.", monthlyRent: 9500, genderCategory: "Any", amenities: ["WiFi", "Air Conditioning", "Private Bathroom", "CCTV", "Parking"], houseRules: "No pets.", capacity: 6, availableSlots: 2 });

const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
await j("POST", "/reservations", juan.token, { listingId: casa._id, moveInDate: day(30), message: "Hi! I'm a 2nd year Nursing student at UST. I'd like a lower bunk if possible." });
const r2 = await j("POST", "/reservations", ana.token, { listingId: casa._id, moveInDate: day(14), message: "Hello po, I start my OJT next month." });
await j("POST", "/reservations", carlo.token, { listingId: pasig._id, moveInDate: day(7) });
const r4 = await j("POST", "/reservations", juan.token, { listingId: pasig._id, moveInDate: day(21), message: "Is the slot still available for next month?" });
await j("PATCH", `/reservations/${r2._id}/accept`, maria.token);
await j("PATCH", `/reservations/${r4._id}/reject`, jose.token);

const t = await j("POST", "/inquiries", juan.token, { listingId: casa._id, body: "Good day! Is water and electricity included in the ₱4,500?" });
await j("POST", `/inquiries/${t._id}/messages`, maria.token, { body: "Hi Juan! Water is included. Electricity is split among roommates, usually around ₱500 a month." });
await j("POST", `/inquiries/${t._id}/messages`, juan.token, { body: "Thank you po! Can I visit this Saturday?" });
await j("POST", `/inquiries/${t._id}/messages`, maria.token, { body: "Sure, anytime between 9 AM and 5 PM. Just look for Ate Joy at the front desk." });

console.log("Demo data loaded. Log in as maria@findorm.test (owner) or juan@findorm.test (seeker), password Password123.");
