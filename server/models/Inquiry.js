import mongoose from "mongoose";

// docs/data-model.md → Inquiry. One thread per seeker–listing pair (D-07).
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      required: [true, "Write a message first."],
      trim: true,
      maxlength: [1000, "Use 1000 characters or fewer."],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const inquirySchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    // The seeker who started the thread.
    seeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Copied from listing.owner when the thread is created.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messages: {
      type: [messageSchema],
      validate: {
        validator: (val) => val.length > 0,
        message: "A thread needs at least one message.",
      },
    },
    lastMessageAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

inquirySchema.index({ listing: 1, seeker: 1 }, { unique: true });
inquirySchema.index({ seeker: 1, lastMessageAt: -1 });
inquirySchema.index({ owner: 1, lastMessageAt: -1 });

const Inquiry = mongoose.model("Inquiry", inquirySchema);

export default Inquiry;
