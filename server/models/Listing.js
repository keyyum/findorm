import mongoose from "mongoose";
import { AMENITIES, CITIES, GENDER_CATEGORIES, MAX_PHOTOS, PROPERTY_TYPES } from "../config/constants.js";

const wholeNumber = (label) => ({
  validator: Number.isInteger,
  message: `${label} must be a whole number.`,
});

// Sub-schema for photos (embedded from Cloudinary). Each photo keeps its own
// _id so DELETE /api/listings/:id/photos/:photoId can find it.
const photoSchema = new mongoose.Schema({
  url: { type: String, required: true }, // Cloudinary secure_url
  publicId: { type: String, required: true }, // Cloudinary public_id, needed to delete
});

// docs/data-model.md → Listing
const listingSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Set by the server from the logged-in owner
    },
    name: {
      type: String,
      required: [true, "Enter the property name."],
      trim: true,
      minlength: [3, "Use at least 3 characters."],
      maxlength: [100, "Use 100 characters or fewer."],
    },
    propertyType: {
      type: String,
      required: [true, "Choose a property type."],
      enum: { values: PROPERTY_TYPES, message: "Choose Dormitory or Boarding House." },
    },
    city: {
      type: String,
      required: [true, "Choose a city."],
      enum: { values: CITIES, message: "Choose a city in Metro Manila." },
    },
    address: {
      type: String,
      required: [true, "Enter the address."],
      trim: true,
      minlength: [5, "Use at least 5 characters."],
      maxlength: [200, "Use 200 characters or fewer."],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Use 2000 characters or fewer."],
      default: "",
    },
    monthlyRent: {
      type: Number,
      required: [true, "Enter the monthly rent."],
      min: [1, "Monthly rent must be at least 1."],
      max: [100000, "Monthly rent can be at most 100000."],
      validate: wholeNumber("Monthly rent"),
    },
    genderCategory: {
      type: String,
      required: [true, "Choose who can stay."],
      enum: { values: GENDER_CATEGORIES, message: "Choose Male, Female, or Any." },
    },
    amenities: {
      type: [{ type: String, enum: { values: AMENITIES, message: "Unknown amenity: {VALUE}." } }],
      default: [],
      validate: {
        validator: (val) => new Set(val).size === val.length,
        message: "Amenities must not contain duplicates.",
      },
    },
    houseRules: {
      type: String,
      trim: true,
      maxlength: [2000, "Use 2000 characters or fewer."],
      default: "",
    },
    capacity: {
      type: Number,
      required: [true, "Enter the capacity."],
      min: [1, "Capacity must be at least 1."],
      max: [500, "Capacity can be at most 500."],
      validate: wholeNumber("Capacity"),
    },
    availableSlots: {
      type: Number,
      required: [true, "Enter the available slots."],
      min: [0, "Available slots can't be negative."],
      validate: [
        wholeNumber("Available slots"),
        {
          validator: function (value) {
            return value <= this.capacity;
          },
          message: "Available slots can't be more than the capacity.",
        },
      ],
    },
    photos: {
      type: [photoSchema],
      default: [],
      validate: {
        validator: (val) => val.length <= MAX_PHOTOS,
        message: `A listing can have up to ${MAX_PHOTOS} photos.`,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false, id: false },
  }
);

// Derived, not stored: shown as "Full" when no slots remain (FR-16).
listingSchema.virtual("isFull").get(function () {
  return this.availableSlots === 0;
});

listingSchema.index({ city: 1, monthlyRent: 1 });
listingSchema.index({ owner: 1 });

const Listing = mongoose.model("Listing", listingSchema);

export default Listing;
