import mongoose from "mongoose";
import User from "../models/User.js";
import Listing from "../models/Listing.js";
import { httpError } from "../middleware/errorHandler.js";
import { paging, pagedResponse } from "../utils/paging.js";
import { ROLES } from "../config/constants.js";
import { escapeRegex, listingSearch, SUMMARY_FIELDS, toSummary } from "./listingController.js";

// GET /api/admin/users — FR-17 (admin only, enforced in the route)
export const getUsers = async (req, res) => {
  const { role, isActive, q } = req.query;

  const errors = {};
  if (role && !ROLES.includes(role)) errors.role = "Choose seeker, owner, or admin.";
  if (isActive && !["true", "false"].includes(isActive)) errors.isActive = "Use true or false.";
  if (Object.keys(errors).length) {
    throw httpError(400, "Please fix the filters.", errors);
  }

  const query = {};
  if (role) query.role = role;
  if (isActive) query.isActive = isActive === "true";
  if (q?.trim()) {
    const regex = escapeRegex(q.trim());
    const pattern = new RegExp(regex, "i");
    query.$or = [
      { firstName: pattern },
      { lastName: pattern },
      { email: pattern },
      // So "Juan Dela" finds Juan Dela Cruz.
      { $expr: { $regexMatch: { input: { $concat: ["$firstName", " ", "$lastName"] }, regex, options: "i" } } },
    ];
  }

  const pg = paging(req.query);
  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    User.countDocuments(query),
  ]);

  return res.status(200).json(pagedResponse(users, total, pg));
};

// PATCH /api/admin/users/:id/status — FR-17, D-08
export const updateUserStatus = async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== "boolean") {
    throw httpError(400, "Please fix the highlighted fields.", { isActive: "Use true or false." });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    throw httpError(404, "User not found.");
  }
  // D-08: admins (including yourself) can't be deactivated.
  if (user.role === "admin") {
    throw httpError(400, "Admin accounts can't be deactivated.");
  }

  // Takes effect on the user's next request: auth checks isActive every time.
  user.isActive = isActive;
  await user.save();

  return res.status(200).json(user);
};

// GET /api/admin/listings — FR-17
// Same filters as GET /api/listings, plus ownerId. Owner shown as PublicUser.
export const getAllListings = async (req, res) => {
  const { ownerId } = req.query;
  if (ownerId && !mongoose.isValidObjectId(ownerId)) {
    throw httpError(400, "Please fix the search filters.", { ownerId: "That owner doesn't exist." });
  }

  const { query, sort } = listingSearch(req.query);
  if (ownerId) query.owner = ownerId;

  const pg = paging(req.query);
  const [listings, total] = await Promise.all([
    Listing.find(query)
      .select(`${SUMMARY_FIELDS} owner`)
      .populate("owner", "firstName lastName")
      .sort(sort)
      .skip(pg.skip)
      .limit(pg.limit),
    Listing.countDocuments(query),
  ]);

  const items = listings.map((l) => ({ ...toSummary(l), owner: l.owner }));
  return res.status(200).json(pagedResponse(items, total, pg));
};
