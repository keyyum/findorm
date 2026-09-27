const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    seeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected', 'Withdrawn'],
      default: 'Pending',
      required: true,
    },
    moveInDate: {
      type: Date,
      required: false,
      validate: {
        validator: function (value) {
          if (!value) return true;
          // Ensure moveInDate is today or later
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return value >= today;
        },
        message: 'Move-in date must be today or later.',
      },
    },
    message: {
      type: String,
      maxLength: [500, 'Message cannot exceed 500 characters'],
      trim: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent multiple Pending or Accepted requests for the same listing by the same seeker (D-03)
reservationSchema.index(
  { listing: 1, seeker: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['Pending', 'Accepted'] },
    },
  }
);

module.exports = mongoose.model('Reservation', reservationSchema);