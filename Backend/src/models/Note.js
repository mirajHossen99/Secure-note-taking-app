import mongoose from "mongoose";
const { Schema } = mongoose;

const noteSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

noteSchema.index({ owner: 1, createdAt: -1 });
noteSchema.index({ createdAt: -1 });

noteSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Note = mongoose.model("Note", noteSchema);
export default Note;
