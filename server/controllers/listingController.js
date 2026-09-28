import { v2 as cloudinary } from "cloudinary";
import Listing from "../models/Listing.js";
import Reservation from "../models/Reservation.js";
import Inquiry from "../models/Inquiry.js";
import { httpError } from "../middleware/errorHandler.js";
import { paging, pagedResponse } from "../utils/paging.js";
import { CITIES, GENDER_CATEGORIES, MAX_PHOTOS, PROPERTY_TYPES } from "../config/constants.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Fields an owner (or admin) may set. Anything else in the body is ignored,
// so `owner`, `photos`, `_id` etc. can't be overwritten.
const EDITABLE_FIELDS = [
  "name", "propertyType", "city", "address", "description", "monthlyRent",
  "genderCategory", "amenities", "houseRules", "capacity", "availableSlots",
];

const pick = (body, fields) =>
  Object.fromEntries(fields.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

/** ListingSummary from docs/api-spec.md — used in search results and lists. */
export const toSummary = (l) => ({
  _id: l._id,
  name: l.name,
  propertyType: l.propertyType,
  city: l.city,
  monthlyRent: l.monthlyRent,
  genderCategory: l.genderCategory,
  availableSlots: l.availableSlots,
  capacity: l.capacity,
  isFull: l.availableSlots === 0,
  photo: l.photos?.[0]?.url || null,
});

export const SUMMARY_FIELDS = "name propertyType city monthlyRent genderCategory availableSlots capacity photos";

// Treats user input as plain text inside a regex (so "(" or ".*" can't break the query).
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { monthlyRent: 1, createdAt: -1 },
  price_desc: { monthlyRent: -1, createdAt: -1 },
};

// D-12: a gender filter shows listings that accept that gender.
const GENDER_FILTER = {
  Male: ["Male", "Any"],
  Female: ["Female", "Any"],
  Any: ["Any"],
};

/**
 * Loads a listing the caller may manage. Someone else's listing is reported as
 * 404, not 403, so its existence isn't revealed (docs/api-spec.md → Errors).
 */
async function findManageable(req, { allowAdmin }) {
  const listing = await Listing.findById(req.params.id);
  const isOwner = listing && listing.owner.toString() === req.user.id;
  const isAdmin = allowAdmin && req.user.role === "admin";
  if (!listing || (!isOwner && !isAdmin)) {
    throw httpError(404, "Listing not found.");
  }
  return listing;
}

// POST /api/listings — FR-04, FR-05 (owner only, enforced in the route)
export const addListing = async (req, res) => {
  const listing = await Listing.create({
    ...pick(req.body, EDITABLE_FIELDS),
    owner: req.user.id, // Set by server from token, never from the body
  });

  return res.status(201).json(listing);
};

/**
 * Turns the search query string into a Mongo filter and sort. Shared by the
 * public search and GET /api/admin/listings ("same filters", docs/api-spec.md).
 */
export function listingSearch(reqQuery) {
  const { city, q, minPrice, maxPrice, propertyType, gender, available, sort = "newest" } = reqQuery;

  // Unknown values are a 400, not an empty list, so typos are caught early.
  const errors = {};
  if (city && !CITIES.includes(city)) errors.city = "Choose a city in Metro Manila.";
  if (propertyType && !PROPERTY_TYPES.includes(propertyType)) errors.propertyType = "Choose Dormitory or Boarding House.";
  if (gender && !GENDER_CATEGORIES.includes(gender)) errors.gender = "Choose Male, Female, or Any.";
  if (!SORTS[sort]) errors.sort = "Sort by newest, price_asc, or price_desc.";
  if (minPrice && !Number.isFinite(Number(minPrice))) errors.minPrice = "Enter a number.";
  if (maxPrice && !Number.isFinite(Number(maxPrice))) errors.maxPrice = "Enter a number.";
  if (available && !["true", "false"].includes(available)) errors.available = "Use true or false.";
  if (Object.keys(errors).length) {
    throw httpError(400, "Please fix the search filters.", errors);
  }

  const query = {};
  if (city) query.city = city;
  if (q?.trim()) {
    const pattern = new RegExp(escapeRegex(q.trim()), "i");
    query.$or = [{ name: pattern }, { address: pattern }];
  }
  if (minPrice || maxPrice) {
    query.monthlyRent = {};
    if (minPrice) query.monthlyRent.$gte = Number(minPrice);
    if (maxPrice) query.monthlyRent.$lte = Number(maxPrice);
  }
  if (propertyType) query.propertyType = propertyType;
  if (gender) query.genderCategory = { $in: GENDER_FILTER[gender] };
  if (available === "true") query.availableSlots = { $gt: 0 };

  return { query, sort: SORTS[sort] };
}

// GET /api/listings — FR-07, FR-08, FR-09 (public)
export const getListings = async (req, res) => {
  const { query, sort } = listingSearch(req.query);

  const pg = paging(req.query);
  const [listings, total] = await Promise.all([
    Listing.find(query).select(SUMMARY_FIELDS).sort(sort).skip(pg.skip).limit(pg.limit),
    Listing.countDocuments(query),
  ]);

  return res.status(200).json(pagedResponse(listings.map(toSummary), total, pg));
};

// GET /api/listings/mine — FR-04 (owner only)
export const getMyListings = async (req, res) => {
  const query = { owner: req.user.id };
  const pg = paging(req.query);

  const [listings, total] = await Promise.all([
    Listing.find(query).select(SUMMARY_FIELDS).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    Listing.countDocuments(query),
  ]);

  return res.status(200).json(pagedResponse(listings.map(toSummary), total, pg));
};

// GET /api/listings/:id — FR-10 (public)
export const getListingById = async (req, res) => {
  // Owner is shown as a PublicUser: name only, never email or phone (NFR-04).
  const listing = await Listing.findById(req.params.id).populate("owner", "firstName lastName");

  if (!listing) {
    throw httpError(404, "Listing not found.");
  }

  return res.status(200).json(listing);
};

// PATCH /api/listings/:id — FR-04, FR-17 (owner of this listing, or admin)
export const updateListing = async (req, res) => {
  const listing = await findManageable(req, { allowAdmin: true });

  const updates = pick(req.body, EDITABLE_FIELDS);
  const nextCapacity = updates.capacity ?? listing.capacity;
  const nextSlots = updates.availableSlots ?? listing.availableSlots;
  if (Number(nextCapacity) < Number(nextSlots)) {
    throw httpError(400, "Please fix the highlighted fields.", {
      capacity: "Capacity can't be lower than the available slots.",
    });
  }

  listing.set(updates);
  await listing.save();

  return res.status(200).json(listing);
};

// PATCH /api/listings/:id/availability — FR-06 (owner of this listing)
export const updateListingAvailability = async (req, res) => {
  const listing = await findManageable(req, { allowAdmin: false });
  const { availableSlots } = req.body;

  if (!Number.isInteger(availableSlots) || availableSlots < 0 || availableSlots > listing.capacity) {
    throw httpError(400, "Please fix the highlighted fields.", {
      availableSlots: `Enter a whole number from 0 to ${listing.capacity}.`,
    });
  }

  listing.availableSlots = availableSlots;
  await listing.save();

  return res.status(200).json(listing);
};

// DELETE /api/listings/:id — FR-04, FR-17 (owner of this listing, or admin)
export const deleteListing = async (req, res) => {
  const listing = await findManageable(req, { allowAdmin: true });

  // Delete the data first (D-11). Photos are cleaned up afterwards, so a
  // Cloudinary hiccup can never leave a listing whose photos are gone.
  await Promise.all([
    Reservation.deleteMany({ listing: listing._id }),
    Inquiry.deleteMany({ listing: listing._id }),
  ]);
  await listing.deleteOne();

  // async wrapper: destroy() can also throw synchronously (e.g. missing Cloudinary keys).
  const results = await Promise.allSettled(listing.photos.map(async (p) => cloudinary.uploader.destroy(p.publicId)));
  for (const r of results) {
    if (r.status === "rejected") console.error("Cloudinary cleanup failed:", r.reason?.message || r.reason);
  }

  return res.status(204).send();
};

// POST /api/listings/:id/photos — FR-05 (owner of this listing)
export const addListingPhotos = async (req, res) => {
  const listing = await findManageable(req, { allowAdmin: false });

  if (!req.files?.length) {
    throw httpError(400, "Choose at least one photo.");
  }
  if (listing.photos.length + req.files.length > MAX_PHOTOS) {
    throw httpError(400, `A listing can have up to ${MAX_PHOTOS} photos.`);
  }

  const uploaded = await Promise.all(
    req.files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({ folder: "findorm/listings" }, (error, result) => {
            if (error) return reject(error);
            resolve({ url: result.secure_url, publicId: result.public_id });
          });
          stream.end(file.buffer);
        })
    )
  );

  listing.photos.push(...uploaded);
  await listing.save();

  return res.status(200).json(listing);
};

// DELETE /api/listings/:id/photos/:photoId — FR-05 (owner of this listing)
export const deleteListingPhoto = async (req, res) => {
  const listing = await findManageable(req, { allowAdmin: false });

  const photo = listing.photos.id(req.params.photoId);
  if (!photo) {
    throw httpError(404, "Photo not found.");
  }

  await cloudinary.uploader.destroy(photo.publicId);
  photo.deleteOne();
  await listing.save();

  return res.status(200).json(listing);
};
