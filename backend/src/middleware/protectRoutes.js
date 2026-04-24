import { requireAuth } from '@clerk/express'
import User from '../models/User.js'

export const protectRoute = [

    // Use requireAuth() to protect this route
    requireAuth({signInUrl:"/sigin"}),
    async (req, res, next) => {
        try {
            const clerkId = req.auth.userId;

            if (!clerkId) return res.status(401).json({ message: "Unauthorized User" });
            // find user in db by clerkID
            let user = await User.findOne({ clerkId });

            if (!user) return res.status(404).json({ message: "User not found" });
            //attach user to request
            req.user = user;

            next();
        }
        catch (err) {
            console.error("Error in protectRoute middleware:", err);
            return res.status(500).json({ message: "Server error", error: err.message });
        }
    }
]

