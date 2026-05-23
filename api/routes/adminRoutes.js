import express from "express";
import { protectRoute, requireAdmin } from "../middleware/protectRoutes.js";
import {
  bootstrapAdmin,
  getAdminAccess,
  getAdminStats,
  getAdminUsers,
  updateUserRole,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/access", protectRoute, getAdminAccess);
router.get("/stats", protectRoute, requireAdmin, getAdminStats);
router.get("/users", protectRoute, requireAdmin, getAdminUsers);
router.patch("/users/:id/role", protectRoute, requireAdmin, updateUserRole);

export const adminRoutes = router;
router.post("/bootstrap", protectRoute, requireAdmin, bootstrapAdmin);
