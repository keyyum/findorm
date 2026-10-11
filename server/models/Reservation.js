import mongoose from "mongoose";
import { RESERVATION_STATUSES } from "../config/constants.js";

// docs/data-model.md → Reservation
const reservationSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    seeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Copied from listing.owner when the request is created.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Withdrawing a Pending request deletes it, so there is no "Withdrawn" status (D-05).
    status: {
      type: String,
      enum: RESERVATION_STATUSES,
      default: "Pending",
      required: true,
    },
    moveInDate: {
      type: Date,
      validate: {
        // Today or later, by the date in Manila, not the server's own time zone
        // (the client sends YYYY-MM-DD, stored as midnight UTC of that date).
        validator: function (value) {
          if (!value) return true;
          const manilaToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
          return value >= new Date(`${manilaToday}T00:00:00Z`);
        },
        message: "Pick today or a later date.",
      },
    },
    message: {
      type: String,
      maxlength: [500, "Use 500 characters or fewer."],
      trim: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

// Backstop for D-03 (one open request per seeker per listing). The controller
// checks this first so it can return a friendly 409.
reservationSchema.index(
  { listing: 1, seeker: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["Pending", "Accepted"] },
    },
  }
);
reservationSchema.index({ seeker: 1, createdAt: -1 });
reservationSchema.index({ owner: 1, status: 1, createdAt: -1 });

const Reservation = mongoose.model("Reservation", reservationSchema);

export default Reservation;
