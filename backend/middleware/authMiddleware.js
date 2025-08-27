import { clerkClient } from "@clerk/express";

// Middleware to protect Educator Routes
export const protectEducator = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const response = await clerkClient.users.getUser(userId);

    if (response.publicMetadata.role !== 'educator') {
      return res.status(403).json({ success: false, message: 'Unauthorized Access' });
    }

    next(); // Allow access to next middleware/route
  } catch (error) {
    console.error('Authorization error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};
