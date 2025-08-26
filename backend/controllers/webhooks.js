import { Webhook } from "svix";
import User from "../models/user.js";

export const clerkWebhooks = async (req, res) => {
  try {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    const payload = JSON.stringify(req.body);
    const headers = {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    };

    const event = wh.verify(payload, headers);
    const { type, data } = event;

    switch (type) {
      case 'user.created': {
        const userData = {
          _id: data.id,
          email: data.email_addresses[0]?.email_address,
          name: `${data.first_name} ${data.last_name}`,
          imageUrl: data.image_url,
          enrolledCourses: [],
        };
        await User.create(userData);
        console.log("✅ User created");
        break;
      }

      case 'user.updated': {
        const userData = {
          email: data.email_addresses[0]?.email_address,
          name: `${data.first_name} ${data.last_name}`,
          imageUrl: data.image_url,
        };
        await User.findByIdAndUpdate(data.id, userData, { new: true });
        console.log("♻️ User updated");
        break;
      }

      case 'user.deleted': {
        await User.findByIdAndDelete(data.id);
        console.log("🗑️ User deleted");
        break;
      }

      default: {
        console.log(`ℹ️ Unhandled event type: ${type}`);
        break;
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Webhook Error:", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};
