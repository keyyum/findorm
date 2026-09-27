import mongoose from "mongoose";

// Sub-schema for photos (embedded from Cloudinary)
const photoSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const listingSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Set by the server from the logged-in owner
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100, // Property name, e.g., "Casa Verde Dormitory"
    },
    propertyType: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 200, // Street, barangay, landmarks
    },
    description: {
      type: String,
      maxlength: 2000,
      default: "",
    },
    monthlyRent: {
      type: Number,
      required: true,
      min: 1,
      max: 100000, // Whole pesos, 1–100000
      validate: {
        validator: Number.isInteger,
        message: "monthlyRent must be a whole number.",
      },
    },
    genderCategory: {
      type: String,
      required: true,
    },
    amenities: {
      type: [String],
      default: [],
      validate: {
        // Ensure no duplicates in the amenities array
        validator: function (val) {
          return new Set(val).size === val.length;
        },
        message: "Amenities must not contain duplicates.",
      },
    },
    houseRules: {
      type: String,
      maxlength: 2000,
      default: "",
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 500, // Whole number, 1–500[cite: 9]
      validate: {
        validator: Number.isInteger,
        message: "capacity must be a whole number.",
      },
    },
    availableSlots: {
      type: Number,
      required: true,
      min: 0,
      validate: [
        {
          validator: Number.isInteger,
          message: "availableSlots must be a whole number.",
        },
        {
          // Custom validation: availableSlots cannot exceed capacity[cite: 9]
          validator: function (value) {
            return value <= this.capacity;
          },
          message: "availableSlots cannot exceed total capacity.",
        },
      ],
    },
    photos: {
      type: [photoSchema],
      default: [],
      validate: {
        // Enforce maximum 10 photos rule[cite: 9]
        validator: function (val) {
          return val.length <= 10;
        },
        message: "Photos array cannot exceed 10 items.",
      },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const Listing = mongoose.model("Listing", listingSchema);

export default Listing;