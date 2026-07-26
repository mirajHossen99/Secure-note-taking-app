import Note from "../models/Note.js";
import asyncHandler from "../utils/asyncHandler.js";
import { buildMeta, getPagination } from "../utils/pagination.js";

// Create a new Note
export const createNote = asyncHandler(async (req, res) => {
  const { title, content, tags } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: "Title and content are required",
    });
  }

  const note = await Note.create({
    title,
    content,
    tags: Array.isArray(tags) ? tags : [],
    owner: req.user._id,
  });

  res.status(201).json({
    success: true,
    note,
  });
});

// Get note by id — User: owner only | Admin: any note
export const getNote = asyncHandler(async (req, res) => {
  const noteId = req.params.id;
  const note = await Note.findById(noteId).populate("owner", "name email");

  if (!note) {
    return res.status(404).json({
      success: false,
      message: "Note not found",
    });
  }

  const isOwner = note.owner._id.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "You do not have access to this note",
    });
  }

  res.json({
    success: true,
    note,
  });
});

// User:  returns only their own notes
// Admin: returns everyone's notes
export const listNotes = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const isAdmin = req.user.role === "admin";

  const filter = isAdmin ? {} : { owner: req.user._id };

  const [notes, total] = await Promise.all([
    Note.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("owner", "name email")
      .lean(),
    Note.countDocuments(filter),
  ]);

  res.json({
    success: true,
    notes,
    meta: buildMeta({ page, limit, total }),
  });
});

// Update note — Owner or Admin
export const updateNote = asyncHandler(async (req, res) => {
  const noteId = req.params.id;
  const note = await Note.findById(noteId);

  if (!note) {
    return res.status(404).json({
      success: false,
      message: "Note not found",
    });
  }

  const isOwner = note.owner.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "You do not have access to this note",
    });
  }

  const { title, content, tags } = req.body;

  if (title !== undefined) {
    if (typeof title === "string" && title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Title cannot be empty",
      });
    }
    note.title = title;
  }

  if (content !== undefined) note.content = content;
  if (Array.isArray(tags)) note.tags = tags;

  await note.save();

  res.json({
    success: true,
    note,
  });
});

// Delete note — Owner or Admin
export const deleteNote = asyncHandler(async (req, res) => {
  const noteId = req.params.id;
  const note = await Note.findById(noteId);

  if (!note) {
    return res.status(404).json({
      success: false,
      message: "Note not found",
    });
  }

  const isOwner = note.owner.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "You do not have access to this note",
    });
  }

  await note.deleteOne();

  res.json({
    success: true,
    message: "Note deleted successfully",
  });
});
