/**
 * Loads demo dorm listings from scripts/seed-data/*.json (gitignored, local use
 * only). Photos go to Cloudinary when CLOUDINARY_* is set; otherwise the server
 * serves them from scripts/seed-data/images at /api/seed-images/. Each JSON file gets its own demo
 * owner account, e.g. ubelt.json → owner.ubelt@findorm.test.
 *
 *   npm run seed-dorms            add listings that aren't there yet
 *   npm run seed-dorms -- --reset delete every demo owner, their listings and photos first
 *
 * Demo owner password: SEED_OWNER_PASSWORD, or a generated one saved to
 * scripts/seed-data/owners.txt. Uses MONGO_URI (and CLOUDINARY_* if set) from server/.env.
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Listing from "../models/Listing.js";
import Reservation from "../models/Reservation.js";
import Inquiry from "../models/Inquiry.js";
import { MAX_PHOTOS } from "../config/constants.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "seed-data");
const CREDENTIALS_FILE = path.join(DATA_DIR, "owners.txt");
const EMAIL_DOMAIN = "findorm.test";
const PHOTO_FOLDER = "findorm/seed";
const LISTING_FIELDS = [
  "name", "propertyType", "city", "address", "description", "monthlyRent",
  "genderCategory", "amenities", "houseRules", "capacity", "availableSlots",
];

const reset = process.argv.includes("--reset");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(DATA_DIR)) fail(`No seed data. Put the JSON files in ${DATA_DIR}.`);
const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")).sort();
if (!files.length) fail(`No .json files in ${DATA_DIR}.`);
const useCloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

function ownerPassword() {
  if (process.env.SEED_OWNER_PASSWORD) return process.env.SEED_OWNER_PASSWORD;
  if (fs.existsSync(CREDENTIALS_FILE)) {
    const saved = fs.readFileSync(CREDENTIALS_FILE, "utf8").match(/^password: (.+)$/m);
    if (saved) return saved[1];
  }
  return crypto.randomBytes(9).toString("base64url");
}

const ownerEmail = (prefix) => `owner.${prefix}@${EMAIL_DOMAIN}`;

async function resetDemoData() {
  const owners = await User.find({ email: new RegExp(`^owner\\.[a-z0-9-]+@${EMAIL_DOMAIN.replace(".", "\\.")}$`) });
  const ownerIds = owners.map((o) => o._id);
  const listings = await Listing.find({ owner: { $in: ownerIds } });
  const listingIds = listings.map((l) => l._id);

  const publicIds = listings.flatMap((l) => l.photos.map((p) => p.publicId)).filter((id) => !id.startsWith("local/"));
  for (let i = 0; i < publicIds.length; i += 100) {
    await cloudinary.api.delete_resources(publicIds.slice(i, i + 100));
  }
  await Reservation.deleteMany({ listing: { $in: listingIds } });
  await Inquiry.deleteMany({ listing: { $in: listingIds } });
  await Listing.deleteMany({ _id: { $in: listingIds } });
  await User.deleteMany({ _id: { $in: ownerIds } });
  console.log(`Reset: removed ${owners.length} demo owners, ${listings.length} listings, ${publicIds.length} photos.`);
}

async function findOrCreateOwner(prefix, password) {
  const email = ownerEmail(prefix);
  const existing = await User.findOne({ email });
  if (existing) return existing;

  const label = prefix.charAt(0).toUpperCase() + prefix.slice(1);
  const user = new User({ firstName: label, lastName: "Demo Owner", email, password: "unhashed", role: "owner" });
  await user.validate();
  user.password = await bcrypt.hash(password, 10);
  return user.save();
}

async function uploadPhotos(photoPaths, prefix, index) {
  const photos = [];
  for (const [k, rel] of photoPaths.slice(0, MAX_PHOTOS).entries()) {
    const file = path.join(DATA_DIR, rel);
    if (!fs.existsSync(file)) {
      console.warn(`  missing photo ${rel}, skipped`);
      continue;
    }
    if (!useCloudinary) {
      const name = path.basename(rel);
      photos.push({ url: `/api/seed-images/${encodeURIComponent(name)}`, publicId: `local/${name}` });
      continue;
    }
    // Fixed public_id so re-running overwrites instead of piling up copies.
    const result = await cloudinary.uploader.upload(file, {
      folder: PHOTO_FOLDER,
      public_id: `${prefix}-${index + 1}-${k + 1}`,
      overwrite: true,
    });
    photos.push({ url: result.secure_url, publicId: result.public_id });
  }
  return photos;
}

await connectDB();
console.log(useCloudinary ? "Photos: uploading to Cloudinary." : "Photos: no Cloudinary keys, serving them from the server.");
if (reset) await resetDemoData();

const password = ownerPassword();
let created = 0;
let skipped = 0;
let failed = 0;

for (const file of files) {
  const prefix = path.basename(file, ".json");
  let dorms;
  try {
    dorms = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8"));
  } catch (err) {
    console.error(`${file}: not valid JSON (${err.message}), skipped`);
    continue;
  }

  const owner = await findOrCreateOwner(prefix, password);
  console.log(`${file}: ${dorms.length} dorms → ${owner.email}`);

  for (const [i, dorm] of dorms.entries()) {
    if (await Listing.exists({ owner: owner._id, name: dorm.name })) {
      skipped++;
      continue;
    }

    const fields = Object.fromEntries(LISTING_FIELDS.filter((f) => dorm[f] !== undefined).map((f) => [f, dorm[f]]));
    const listing = new Listing({ ...fields, owner: owner._id });
    try {
      await listing.validate();
    } catch (err) {
      console.error(`  ✗ ${dorm.name}: ${Object.values(err.errors || {}).map((e) => e.message).join(" ") || err.message}`);
      failed++;
      continue;
    }

    listing.photos = await uploadPhotos(dorm.photos || [], prefix, i);
    await listing.save();
    console.log(`  ✓ ${listing.name} (${listing.photos.length} photos)`);
    created++;
  }
}

fs.writeFileSync(
  CREDENTIALS_FILE,
  `Demo owner accounts (local only)\n${files.map((f) => ownerEmail(path.basename(f, ".json"))).join("\n")}\npassword: ${password}\n`
);
console.log(`\nDone: ${created} created, ${skipped} already there, ${failed} invalid. Owner logins are in scripts/seed-data/owners.txt.`);
await mongoose.disconnect();
