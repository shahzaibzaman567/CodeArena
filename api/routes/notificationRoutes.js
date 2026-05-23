import express from "express";
import { protectRoute, requireAdmin } from "../middleware/protectRoutes.js";
import { createNotification, deleteNotification, getNotifications, updateNotification } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", protectRoute, getNotifications);
router.post("/", protectRoute, requireAdmin, createNotification);
router.put("/:id", protectRoute, requireAdmin, updateNotification);
router.delete("/:id", protectRoute, requireAdmin, deleteNotification);

export const notificationRoutes = router;
