import Book from "../models/Book.js";

// Get all books with optional search filter
export async function getAllBooks(req, res) {
  try {
    const { search } = req.query;
    let filter = {};
    if (search) {
      filter = { title: { $regex: search, $options: "i" } };
    }
    const books = await Book.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ books });
  } catch (err) {
    console.error("Error in getAllBooks:", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

// Create a new book
export async function createBook(req, res) {
  try {
    const { title, thumbnailUrl, pdfUrl, rating } = req.body;
    if (!title || !thumbnailUrl || !pdfUrl) {
      return res.status(400).json({ message: "Title, thumbnail URL, and PDF URL are required" });
    }

    const book = await Book.create({
      title,
      thumbnailUrl,
      pdfUrl,
      rating: rating ? Number(rating) : 4,
    });

    res.status(201).json({ book });
  } catch (err) {
    console.error("Error in createBook:", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

// Update a book
export async function updateBook(req, res) {
  try {
    const { id } = req.params;
    const { title, thumbnailUrl, pdfUrl, rating } = req.body;

    if (!title || !thumbnailUrl || !pdfUrl) {
      return res.status(400).json({ message: "Title, thumbnail URL, and PDF URL are required" });
    }

    const book = await Book.findByIdAndUpdate(
      id,
      { title, thumbnailUrl, pdfUrl, rating: Number(rating) },
      { new: true }
    );

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.status(200).json({ book });
  } catch (err) {
    console.error("Error in updateBook:", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

// Delete a book
export async function deleteBook(req, res) {
  try {
    const { id } = req.params;
    const book = await Book.findByIdAndDelete(id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    res.status(200).json({ message: "Book deleted successfully" });
  } catch (err) {
    console.error("Error in deleteBook:", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

// Seed helper to populate initial books
export async function seedBooks(req, res) {
  try {
    const count = await Book.countDocuments();
    if (count > 0) {
      return res.status(200).json({ message: "Database already seeded", count });
    }

    const initialBooks = [
      {
        title: "The Rust Programming Language",
        thumbnailUrl: "/rust.webp",
        pdfUrl: "/Books/rust-programming-language-steve-klabnik.pdf",
        rating: 5,
      },
      {
        title: "Learning Python",
        thumbnailUrl: "/python.png",
        pdfUrl: "/Books/Learning_Python.pdf",
        rating: 4,
      },
      {
        title: "The JavaScript Handbook",
        thumbnailUrl: "/javascript.png",
        pdfUrl: "/Books/JavaScript.pdf",
        rating: 3,
      },
      {
        title: "Essential TypeScript",
        thumbnailUrl: "/typescript.png",
        pdfUrl: "/Books/Essential_TypeScript_ccb1.pdf",
        rating: 4,
      },
      {
        title: "Fundamentals of Computer Programming with C#",
        thumbnailUrl: "/csharp.png",
        pdfUrl: "/Books/Fundamentals-of-Computer-Programming-with-CSharp-Nakov-eBook-v2013.pdf",
        rating: 4,
      },
      {
        title: "Java Programming Language",
        thumbnailUrl: "/java.png",
        pdfUrl: "/Books/javabook.pdf",
        rating: 3,
      },
      {
        title: "C++ Programming",
        thumbnailUrl: "/c++.png",
        pdfUrl: "/Books/C++.pdf",
        rating: 5,
      },
      {
        title: "The Go Programming Language",
        thumbnailUrl: "/bash.webp",
        pdfUrl: "/Books/9780321884992.pdf",
        rating: 5,
      },
    ];

    const seeded = await Book.insertMany(initialBooks);
    res.status(201).json({ message: "Books seeded successfully", count: seeded.length, books: seeded });
  } catch (err) {
    console.error("Error in seedBooks:", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}
