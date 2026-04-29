import express from "express";
import { protectRoute } from "../middleware/protectRoutes.js";
import {
  getCommunityMessages,
  createCommunityMessage,
  replyToMessage,
  deleteCommunityMessage,
} from "../controllers/communityController.js";

const router = express.Router();

router.get("/", getCommunityMessages);
router.post("/", protectRoute, createCommunityMessage);
router.post("/:messageId/reply", protectRoute, replyToMessage);
router.delete("/:messageId", protectRoute, deleteCommunityMessage);

export const communityRoutes = router;
