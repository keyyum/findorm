import mongoose from "mongoose";
import Reservation from "../models/Reservation.js";
import Listing from "../models/Listing.js";
import { httpError } from "../middleware/errorHandler.js";
import { paging, pagedResponse } from "../utils/paging.js";
import { RESERVATION_STATUSES } from "../config/constants.js";
import { ownerIsInactive } from "./listingController.js";

// Every 409 here carries a `code` so the client can tell them apart without
// reading the message (findorm-loopholes #2).
const full = () => httpError(409, "This listing is full.", undefined, "LISTING_FULL");
const duplicate = () => httpError(409, "You already have an open request for this listing.", undefined, "DUPLICATE_REQUEST");
const notPending = () => httpError(409, "This request was already answered or withdrawn.", undefined, "NOT_PENDING");

// After a rejection the seeker waits this long before asking the same listing again (findorm-loopholes #13).
const REQUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Reservation object from docs/api-spec.md: listing and seeker are populated,
// seeker as a PublicUser (name only, NFR-04).
const POPULATE = [
  { path: "listing", select: "name city monthlyRent availableSlots" },
  { path: "seeker", select: "firstName lastName" },
];

/** Optional `status` filter for the two list endpoints. */
function statusFilter(status) {
  if (status === undefined) return {};
  if (!RESERVATION_STATUSES.includes(status)) {
    throw httpError(400, "Please fix the filters.", { status: "Choose Pending, Accepted, or Rejected." });
  }
  return { status };
}

async function listReservations(req, res, query) {
  const pg = paging(req.query);
  const [items, total] = await Promise.all([
    Reservation.find(query).populate(POPULATE).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    Reservation.countDocuments(query),
  ]);
  return res.status(200).json(pagedResponse(items, total, pg));
}

/**
 * After a conditional update matched nothing: 404 if the caller can't see the
 * request (missing, or someone else's), 409 if it's just no longer Pending.
 */
async function notPendingOrMissing(id, who) {
  const exists = await Reservation.exists({ _id: id, ...who });
  return exists ? notPending() : httpError(404, "Request not found.");
}

// POST /api/reservations — FR-13 (seeker only, enforced in the route)
export const createReservation = async (req, res) => {
  const { listingId, moveInDate, message } = req.body;

  const errors = {};
  if (!listingId) errors.listingId = "Choose a listing.";
  else if (!mongoose.isValidObjectId(listingId)) errors.listingId = "That listing doesn't exist.";
  if (moveInDate && Number.isNaN(Date.parse(moveInDate))) errors.moveInDate = "Enter a valid date.";
  if (message !== undefined && typeof message !== "string") errors.message = "Write the note as text.";
  if (Object.keys(errors).length) {
    throw httpError(400, "Please fix the highlighted fields.", errors);
  }

  const listing = await Listing.findById(listingId).select("owner availableSlots");
  if (!listing) {
    throw httpError(404, "Listing not found.");
  }
  // findorm-loopholes #11: a deactivated owner can't answer.
  if (await ownerIsInactive(listing.owner)) {
    throw httpError(409, "This owner isn't taking requests right now.", undefined, "OWNER_INACTIVE");
  }
  // D-04: no new requests while the listing is full.
  if (listing.availableSlots === 0) {
    throw full();
  }
  // D-03: one open (Pending or Accepted) request per seeker per listing.
  const open = await Reservation.exists({
    listing: listing._id,
    seeker: req.user.id,
    status: { $in: ["Pending", "Accepted"] },
  });
  if (open) {
    throw duplicate();
  }
  const recentlyRejected = await Reservation.exists({
    listing: listing._id,
    seeker: req.user.id,
    status: "Rejected",
    respondedAt: { $gt: new Date(Date.now() - REQUEST_COOLDOWN_MS) },
  });
  if (recentlyRejected) {
    throw httpError(409, "The owner declined your last request. You can ask again 24 hours after it was declined.", undefined, "REQUEST_COOLDOWN");
  }

  let reservation;
  try {
    reservation = await Reservation.create({
      listing: listing._id,
      seeker: req.user.id, // Set by the server, never from the body
      owner: listing.owner,
      moveInDate: moveInDate || undefined,
      message,
    });
  } catch (err) {
    // Two requests sent at the same moment: the unique index catches the second.
    if (err.code === 11000) throw duplicate();
    throw err;
  }

  await reservation.populate(POPULATE);
  return res.status(201).json(reservation);
};

// GET /api/reservations/mine — FR-15 (seeker only)
export const getMyReservations = (req, res) =>
  listReservations(req, res, { seeker: req.user.id, ...statusFilter(req.query.status) });

// GET /api/reservations/incoming — FR-14 (owner only)
export const getIncomingReservations = (req, res) => {
  const { listingId } = req.query;
  if (listingId !== undefined && !mongoose.isValidObjectId(listingId)) {
    throw httpError(400, "Please fix the filters.", { listingId: "That listing doesn't exist." });
  }

  const query = { owner: req.user.id, ...statusFilter(req.query.status) };
  if (listingId) query.listing = listingId;
  return listReservations(req, res, query);
};

// PATCH /api/reservations/:id/accept — FR-14, FR-16 (owner of the listing)
export const acceptReservation = async (req, res) => {
  const who = { owner: req.user.id };
  const reservation = await Reservation.findOne({ _id: req.params.id, ...who }).select("listing status");
  if (!reservation) {
    throw httpError(404, "Request not found.");
  }
  if (reservation.status !== "Pending") {
    throw notPending();
  }

  // Take the slot first, in one step, so two accepts at the same moment can
  // never push availableSlots below 0 (docs/data-model.md → Reservation).
  const listing = await Listing.findOneAndUpdate(
    { _id: reservation.listing, availableSlots: { $gt: 0 } },
    { $inc: { availableSlots: -1 } },
    { new: true }
  );
  if (!listing) {
    throw httpError(409, "No slots left. This listing is full.", undefined, "LISTING_FULL");
  }

  const accepted = await Reservation.findOneAndUpdate(
    { _id: reservation._id, status: "Pending" },
    { status: "Accepted", respondedAt: new Date() },
    { new: true }
  ).populate(POPULATE);

  if (!accepted) {
    // Rejected or withdrawn in the meantime: give the slot back.
    await Listing.updateOne({ _id: listing._id }, { $inc: { availableSlots: 1 } });
    throw notPending();
  }

  return res.status(200).json(accepted);
};

// PATCH /api/reservations/:id/reject — FR-14 (owner of the listing)
// Works even when the listing is full (D-04). Slots are unchanged.
export const rejectReservation = async (req, res) => {
  const who = { owner: req.user.id };
  const rejected = await Reservation.findOneAndUpdate(
    { _id: req.params.id, ...who, status: "Pending" },
    { status: "Rejected", respondedAt: new Date() },
    { new: true }
  ).populate(POPULATE);

  if (!rejected) {
    throw await notPendingOrMissing(req.params.id, who);
  }

  return res.status(200).json(rejected);
};

// DELETE /api/reservations/:id — D-05 (seeker who sent it)
export const withdrawReservation = async (req, res) => {
  const who = { seeker: req.user.id };
  const withdrawn = await Reservation.findOneAndDelete({ _id: req.params.id, ...who, status: "Pending" });

  if (!withdrawn) {
    throw await notPendingOrMissing(req.params.id, who);
  }

  return res.status(204).send();
};
