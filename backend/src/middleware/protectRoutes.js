import { requireAuth } from '@clerk/express'
import User from '../models/User.js'

export const protectRoute = [

    // Use requireAuth() to protect this route
    requireAuth({signInUrl:"/sigin"}),
    async (req, res, next) => {
        try {
            const clerkId = req.auth().userId;

            if (!clerkId) return res.status(401).json({ message: "Unauthorized User" });
            // find user in db by clerkID
            let user = User.findOne({ clerkId });

            if (!user) return res.status(404).json("User not found");
            //attach user to request
            req.user = user

            next()
        }
        catch (err) {
            console.error("erro in protectRoute middleware ", err)
        }
    }
]

