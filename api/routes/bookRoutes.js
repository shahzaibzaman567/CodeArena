import express from "express";
import { protectRoute, requireAdmin } from "../middleware/protectRoutes.js";
import {
  getAllBooks,
  createBook,
  updateBook,
  deleteBook,
  seedBooks,
} from "../controllers/bookController.js";

const router = express.Router();

router.get("/", protectRoute, getAllBooks);
router.post("/", protectRoute, requireAdmin, createBook);
router.put("/:id", protectRoute, requireAdmin, updateBook);
router.delete("/:id", protectRoute, requireAdmin, deleteBook);
router.post("/seed", protectRoute, requireAdmin, seedBooks);

export const bookRoutes = router;
