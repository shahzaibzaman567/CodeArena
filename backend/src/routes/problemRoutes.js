import express from "express";
import { protectRoute } from "../middleware/protectRoutes.js";
import {
  createProblem,
  getProblems,
  deleteProblem,
  getProblemById,
} from "../controllers/problemController.js";

const router = express.Router();

router.get("/", getProblems);
router.get("/:id", getProblemById);
router.post("/", protectRoute, createProblem);
router.delete("/:id", protectRoute, deleteProblem);

export const problemRoutes = router;
