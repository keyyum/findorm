import mongoose from "mongoose";
import Inquiry from "../models/Inquiry.js";
import Listing from "../models/Listing.js";
import { httpError } from "../middleware/errorHandler.js";
import { paging, pagedResponse } from "../utils/paging.js";

// Inquiry object from docs/api-spec.md: people as PublicUser (NFR-04).
const POPULATE = [
  { path: "listing", select: "name" },
  { path: "seeker", select: "firstName lastName" },
  { path: "owner", select: "firstName lastName" },
];

/** Message body rules from docs/data-model.md → Message: trimmed, 1–1000 characters. */
function messageBody(body) {
  if (typeof body !== "string" || !body.trim()) {
    throw httpError(400, "Please fix the highlighted fields.", { body: "Write a message first." });
  }
  const trimmed = body.trim();
  if (trimmed.length > 1000) {
    throw httpError(400, "Please fix the highlighted fields.", { body: "Use 1000 characters or fewer." });
  }
  return trimmed;
}

/** Only the thread's seeker and owner may see or post in it (NFR-04). */
const participant = (req) => ({ $or: [{ seeker: req.user.id }, { owner: req.user.id }] });

/** Adds a message and bumps lastMessageAt in one update. Returns null if no thread matched. */
function pushMessage(filter, sender, body) {
  const now = new Date();
  return Inquiry.findOneAndUpdate(
    filter,
    { $push: { messages: { sender, body, createdAt: now } }, $set: { lastMessageAt: now } },
    { new: true }
  ).populate(POPULATE);
}

// POST /api/inquiries — FR-11 (seeker only, enforced in the route)
export const createInquiry = async (req, res) => {
  const { listingId } = req.body;
  if (!listingId || !mongoose.isValidObjectId(listingId)) {
    throw httpError(400, "Please fix the highlighted fields.", { listingId: "Choose a listing." });
  }
  const body = messageBody(req.body.body);

  const listing = await Listing.findById(listingId).select("owner");
  if (!listing) {
    throw httpError(404, "Listing not found.");
  }

  // D-07: one thread per seeker–listing pair. Asking again adds to it.
  const thread = { listing: listing._id, seeker: req.user.id };
  const existing = await pushMessage(thread, req.user.id, body);
  if (existing) {
    return res.status(200).json(existing);
  }

  try {
    const now = new Date();
    const inquiry = await Inquiry.create({
      ...thread,
      owner: listing.owner,
      messages: [{ sender: req.user.id, body, createdAt: now }],
      lastMessageAt: now,
    });
    await inquiry.populate(POPULATE);
    return res.status(201).json(inquiry);
  } catch (err) {
    if (err.code !== 11000) throw err;
    // Two first messages sent at the same moment: the other one made the
    // thread, so add this one to it.
    return res.status(200).json(await pushMessage(thread, req.user.id, body));
  }
};

// GET /api/inquiries — FR-12 (seeker or owner)
// A seeker sees threads they started; an owner sees threads about their listings.
export const getInquiries = async (req, res) => {
  const query = req.user.role === "owner" ? { owner: req.user.id } : { seeker: req.user.id };
  const pg = paging(req.query);

  const [threads, total] = await Promise.all([
    Inquiry.find(query, { messages: { $slice: -1 } })
      .populate(POPULATE)
      .sort({ lastMessageAt: -1 })
      .skip(pg.skip)
      .limit(pg.limit),
    Inquiry.countDocuments(query),
  ]);

  // `owner` isn't in the spec's list shape yet; it lets a seeker's inbox show
  // who they're talking to (issue #21, item 1). The client already uses it.
  const items = threads.map((t) => {
    const last = t.messages[0];
    return {
      _id: t._id,
      listing: t.listing,
      seeker: t.seeker,
      owner: t.owner,
      lastMessage: last ? { body: last.body, sender: last.sender, createdAt: last.createdAt } : null,
      lastMessageAt: t.lastMessageAt,
    };
  });

  return res.status(200).json(pagedResponse(items, total, pg));
};

// GET /api/inquiries/:id — FR-12 (the thread's seeker or owner)
export const getInquiryById = async (req, res) => {
  const inquiry = await Inquiry.findOne({ _id: req.params.id, ...participant(req) }).populate(POPULATE);
  if (!inquiry) {
    throw httpError(404, "Conversation not found.");
  }
  return res.status(200).json(inquiry);
};

// POST /api/inquiries/:id/messages — FR-12 (the thread's seeker or owner)
export const addInquiryMessage = async (req, res) => {
  const body = messageBody(req.body.body);

  const inquiry = await pushMessage({ _id: req.params.id, ...participant(req) }, req.user.id, body);
  if (!inquiry) {
    throw httpError(404, "Conversation not found.");
  }
  return res.status(201).json(inquiry);
};
