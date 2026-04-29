import express from "express";
import { protectRoute } from "../middleware/protectRoutes.js";
import { getCodeSuggestions, getCodeReview, translateCode } from "../controllers/aiController.js";

const router = express.Router();

router
  .post("/suggestions", protectRoute, getCodeSuggestions)
  .post("/review", protectRoute, getCodeReview)
  .post("/translate", protectRoute, translateCode);

export const aiRoutes = router;
