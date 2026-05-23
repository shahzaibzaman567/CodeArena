import { useDeferredValue, useEffect, useRef, useState } from "react";
import { SearchIcon, BookOpenIcon, Star, Loader2Icon, SparklesIcon } from "lucide-react";
import axios from "../lib/axios.js";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const hasSeededEmptyLibrary = useRef(false);

  const getToken = () => window.__clerk_token;

  const fetchBooks = async (query = "") => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const res = await axios.get(`/books`, {
        params: { search: query },
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const fetchedBooks = res.data.books || [];
      setBooks(fetchedBooks);

      // If no books exist, trigger seeding automatically for demonstration
      if (fetchedBooks.length === 0 && !query && !hasSeededEmptyLibrary.current) {
        hasSeededEmptyLibrary.current = true;
        await handleSeedBooks();
      }
    } catch (err) {
      console.error("Error fetching books:", err);
      toast.error("Failed to load books");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedBooks = async () => {
    try {
      const token = getToken();
      if (!token) return;
      toast.loading("Initializing library catalog...", { id: "seed-loading" });
      await axios.post(`/books/seed`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Library catalog loaded successfully!", { id: "seed-loading" });
      // Fetch again after seeding
      const res = await axios.get(`/books`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBooks(res.data.books || []);
    } catch (err) {
      toast.dismiss("seed-loading");
      console.error("Seeding error:", err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks(deferredSearchQuery.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [deferredSearchQuery]);

  const handleBookClick = (pdfUrl) => {
    if (!pdfUrl) {
      toast.error("PDF link not available");
      return;
    }
    // Prefix with root if absolute path is stored relatively
    const targetUrl = pdfUrl.startsWith("http") ? pdfUrl : pdfUrl;
    window.open(targetUrl, "_blank");
  };

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        background: "linear-gradient(135deg, #0a0f1e 0%, #0d1526 40%, #0a1220 100%)",
      }}
    >
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-slate-900/60 backdrop-blur-md p-8 sm:p-12 mb-12 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl -z-10" />
          
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <SparklesIcon className="size-3.5" />
              CodeArena Library
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Expand Your Coding Knowledge
            </h1>
            <p className="text-sm sm:text-base text-base-content/70">
              Access curated reference guides, textbooks, and documentation to hone your skills alongside your peers. Click any card to open the PDF.
            </p>
          </div>

          <div className="flex gap-2 w-full md:max-w-md shrink-0">
            <div className="relative grow">
              <input
                type="text"
                placeholder="Search reference books..."
                className="input input-bordered w-full pl-10 focus:input-primary bg-base-100/60"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <SearchIcon className="absolute left-3.5 top-3.5 size-4 text-base-content/40" />
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2Icon className="size-10 text-primary animate-spin" />
            <p className="text-sm text-base-content/50">Curating the shelf...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-dashed border-base-300">
            <BookOpenIcon className="size-12 text-base-content/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">No books found</h3>
            <p className="text-sm text-base-content/50 max-w-sm mx-auto mb-6">
              {searchQuery ? "No matches found for your search query. Try another keyword." : "The library catalog is currently empty."}
            </p>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  fetchBooks("");
                }}
                className="btn btn-outline btn-sm"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.map((book) => (
              <div
                key={book._id}
                onClick={() => handleBookClick(book.pdfUrl)}
                className="group relative cursor-pointer flex flex-col justify-between overflow-hidden rounded-2xl border border-base-300 bg-slate-900/40 hover:bg-slate-900/80 backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:border-primary/40"
              >
                {/* Book Thumbnail container */}
                <div className="relative aspect-[3/4] w-full bg-slate-950 overflow-hidden border-b border-base-300">
                  {book.thumbnailUrl ? (
                    <img
                      src={book.thumbnailUrl}
                      alt={book.title}
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary/5">
                      <BookOpenIcon className="size-16 text-primary/20" />
                    </div>
                  )}
                  {/* Read Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="btn btn-sm btn-primary gap-1">
                      <BookOpenIcon className="size-4" />
                      Read PDF
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 space-y-2">
                  {/* Stars */}
                  <div className="flex gap-0.5 items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`size-4 ${
                          star <= book.rating ? "text-amber-400 fill-amber-400" : "text-base-content/10"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-base text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {book.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
