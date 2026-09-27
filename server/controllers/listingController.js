import Listing from "../models/Listing.js";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

export const addListing = async (req, res) => {
    const {
        name,
        propertyType,
        city,
        address,
        description,
        monthlyRent,
        genderCategory, // Fixed typo from genderCatergory
        amenities,
        houseRules,
        capacity,
        availableSlots
    } = req.body;

    try {
        // Validate only mandatory required fields according to schema rules
        if (
            !name ||
            !propertyType ||
            !city ||
            !address ||
            monthlyRent === undefined ||
            !genderCategory ||
            capacity === undefined ||
            availableSlots === undefined
        ) {
            return res.status(400).json({ message: "Invalid input" });
        }

        // Create listing with owner extracted from the token (req.user set by auth middleware)
        const listing = await Listing.create({
            owner: req.user.id, // Set by server from token
            name,
            propertyType,
            city,
            address,
            description,
            monthlyRent,
            genderCategory,
            amenities,
            houseRules,
            capacity,
            availableSlots
        });

        // Return 201 Created status code as required by the docs
        return res.status(201).json(listing);
    } catch (err) {
        return res.status(400).json({ message: "Invalid input" });
    }
};


// Helper arrays to validate enums if needed
const VALID_CITIES = ["Manila", "Quezon City", "Makati"]; // Adjust to your actual D-01 list
const VALID_PROPERTY_TYPES = ["Dormitory", "Apartment", "Condo"]; // Adjust to your property types
const VALID_GENDERS = ["Female", "Male", "Any"];

export const getListings = async (req, res) => {
  try {
    const {
      city,
      q,
      minPrice,
      maxPrice,
      propertyType,
      gender,
      available,
      sort,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // 1. Validate Unknown Enums -> Return 400 early
    if (city && !VALID_CITIES.includes(city)) {
      return res.status(400).json({ message: `Invalid city: ${city}` });
    }
    if (propertyType && !VALID_PROPERTY_TYPES.includes(propertyType)) {
      return res.status(400).json({ message: `Invalid propertyType: ${propertyType}` });
    }
    if (gender && !VALID_GENDERS.includes(gender)) {
      return res.status(400).json({ message: `Invalid gender: ${gender}` });
    }

    // 2. City Filter (Exact match)
    if (city) {
      query.city = city;
    }

    // 3. Keyword Search (q): Case-insensitive match on name OR address
    if (q) {
      query.$or = [
        { name: { $regex: q,$options: "i" } },
        { address: { $regex: q,$options: "i" } },
      ];
    }

    // 4. Price Filters (monthlyRent)
    if (minPrice || maxPrice) {
      query.monthlyRent = {};
      if (minPrice) query.monthlyRent.$gte = Number(minPrice);
      if (maxPrice) query.monthlyRent.$lte = Number(maxPrice);
    }

    // 5. Property Type Filter
    if (propertyType) {
      query.propertyType = propertyType;
    }

    // 6. Gender Filter (D-12 rule: e.g., "Female" matches "Female" and "Any")
    if (gender) {
      if (gender === "Female") {
        query.genderCategory = { $in: ["Female", "Any"] };
      } else if (gender === "Male") {
        query.genderCategory = { $in: ["Male", "Any"] };
      } else {
        query.genderCategory = gender;
      }
    }

    // 7. Availability Filter
    if (available === "true") {
      query.availableSlots = { $gt: 0 };
    }

    // 8. Sorting
    let sortOptions = { createdAt: -1 }; // Default: newest first
    if (sort === "price_asc") {
      sortOptions = { monthlyRent: 1 };
    } else if (sort === "price_desc") {
      sortOptions = { monthlyRent: -1 };
    }

    // 9. Pagination Calculation
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Listing.countDocuments(query),
    ]);

    // 10. Return Paged Result (200 OK)
    return res.status(200).json({
      items: listings,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      total,
    });
  } catch (err) {
    return res.status(400).json({ message: "Invalid request parameters" });
  }
};

export const getMyListings = async (req, res) => {
  try {
    // 1. Get page and limit from query params with defaults
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // 2. Query listings where owner matches logged-in user ID
    const query = { owner: req.user.id };

    // 3. Fetch listings sorted newest first (createdAt: -1) with total count
    const [listings, total] = await Promise.all([
      Listing.find(query)
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limit),
      Listing.countDocuments(query),
    ]);

    // 4. Return paged list structure (using 'items' to match frontend)
    return res.status(200).json({
      items: listings,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch owner listings" });
  }
};

export const getListingById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate if the parameter is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // 2. Fetch the listing by ID (populate owner name/email if needed)
    const listing = await Listing.findById(id).populate(
      "owner",
      "name email phone"
    );

    // 3. Handle 404 if listing does not exist
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // 4. Return full listing details (200 OK)
    return res.status(200).json(listing);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch listing details" });
  }
};


// Ensure Cloudinary is configured with your credentials elsewhere or here
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const addListingPhotos = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate Mongo ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // 2. Fetch listing
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // 3. Verify ownership (Owner can only modify their own listing)[cite: 17]
    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden: Not listing owner" });
    }

    // 4. Validate uploaded files presence
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No photos uploaded" });
    }

    // 5. Enforce 10 photos total constraint[cite: 9, 17]
    if (listing.photos.length + req.files.length > 10) {
      return res.status(400).json({ message: "Cannot exceed 10 photos per listing" });
    }

    // 6. Upload file buffers to Cloudinary
    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "listings" },
          (error, result) => {
            if (error) return reject(error);
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        );
        stream.end(file.buffer);
      });
    });

    const uploadedPhotos = await Promise.all(uploadPromises);

    // 7. Save photo references to database schema[cite: 9]
    listing.photos.push(...uploadedPhotos);
    await listing.save();

    // 8. Return updated listing document[cite: 17]
    return res.status(200).json(listing);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Invalid image upload request" });
  }
};

export const deleteListingPhoto = async (req, res) => {
  try {
    const { id, photoId } = req.params;

    // 1. Validate Mongo ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(photoId)) {
      return res.status(404).json({ message: "Listing or photo not found" });
    }

    // 2. Find the listing
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // 3. Verify ownership
    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden: Not listing owner" });
    }

    // 4. Find the target photo subdocument using subdocument .id() or _id matching
    const photo = listing.photos.id(photoId);
    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    // 5. Delete from Cloudinary if a publicId exists
    if (photo.publicId) {
      await cloudinary.uploader.destroy(photo.publicId);
    }

    // 6. Remove photo subdocument from Mongoose array & save
    listing.photos.pull({ _id: photoId });
    await listing.save();

    // 7. Return updated listing document
    return res.status(200).json(listing);
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete photo" });
  }
};

export const deleteListing = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate Mongo ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // 2. Find listing
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // 3. Authorization check: Owner of the listing OR Admin
    const isOwner = listing.owner.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    // 4. Delete photos from Cloudinary[cite: 11]
    if (listing.photos && listing.photos.length > 0) {
      const deletePhotoPromises = listing.photos
        .filter((photo) => photo.publicId)
        .map((photo) => cloudinary.uploader.destroy(photo.publicId));

      await Promise.all(deletePhotoPromises);
    }

    // 5. Cascade delete related reservations and inquiries[cite: 11]
    await Promise.all([
      Reservation.deleteMany({ listing: id }),
      Inquiry.deleteMany({ listing: id }),
      Listing.findByIdAndDelete(id),
    ]);

    // 6. Return 204 No Content[cite: 11]
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete listing" });
  }
};

export const updateListingAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { availableSlots } = req.body;

    // 1. Validate Mongo ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // 2. Validate body input
    if (typeof availableSlots !== "number" || availableSlots < 0) {
      return res.status(400).json({ message: "availableSlots must be a non-negative number" });
    }

    // 3. Find listing
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // 4. Verify ownership
    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden: Not listing owner" });
    }

    // 5. Enforce slot capacity limit (availableSlots cannot exceed total capacity)
    if (availableSlots > listing.capacity) {
      return res.status(400).json({
        message: `Available slots (${availableSlots}) cannot exceed total capacity (${listing.capacity})`,
      });
    }

    // 6. Update fields and sync isFull status flag
    listing.availableSlots = availableSlots;
    listing.isFull = availableSlots === 0;

    await listing.save();

    // 7. Return updated listing document
    return res.status(200).json(listing);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update availability" });
  }
};

export const updateListing = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate Mongo ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // 2. Fetch existing listing
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // 3. Verify permissions: Owner (own) or Admin
    const isOwner = listing.owner.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    const updates = { ...req.body };

    // 4. Validate capacity restriction:
    // If capacity is lowered below current availableSlots, return 400
    if (updates.capacity !== undefined) {
      const newCapacity = Number(updates.capacity);
      const targetAvailableSlots = updates.availableSlots !== undefined 
        ? Number(updates.availableSlots) 
        : listing.availableSlots;

      if (newCapacity < targetAvailableSlots) {
        return res.status(400).json({
          message: "Capacity cannot be lower than current available slots",
        });
      }

      // Recalculate isFull if capacity changed
      updates.isFull = targetAvailableSlots === 0;
    }

    // 5. Protect immutable properties
    delete updates.photos;
    delete updates.owner;

    // 6. Apply updates and return modified listing
    Object.assign(listing, updates);
    await listing.save();

    return res.status(200).json(listing);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Invalid update payload" });
  }
};