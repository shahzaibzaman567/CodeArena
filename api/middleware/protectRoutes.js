import { requireAuth } from '@clerk/express'
import User from '../models/User.js'

export const protectRoute = [
    requireAuth(),
    async (req, res, next) => {
        try {
            console.log('[protectRoute] auth userId:', req.auth?.userId);
            const clerkId = req.auth?.userId;

            if (!clerkId) {
                console.log('[protectRoute] ❌ No clerkId — unauthorized');
                return res.status(401).json({ message: "Unauthorized" });
            }

            let user = await User.findOne({ clerkId });
            console.log('[protectRoute] DB user found:', !!user);

            if (!user) return res.status(404).json({ message: "User not found" });

            req.user = user;
            next();
        } catch (err) {
            console.error('[protectRoute] ❌ Error:', err.message);
            return res.status(500).json({ message: "Server error", error: err.message });
        }
    }
]

