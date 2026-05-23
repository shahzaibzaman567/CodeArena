import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    pdfUrl: { type: String, required: true },
    rating: { type: Number, default: 4, min: 1, max: 5 },
  },
  { timestamps: true }
);

const Book = mongoose.models.Book || mongoose.model("Book", bookSchema);
export default Book;
