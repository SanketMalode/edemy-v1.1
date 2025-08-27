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
      case "user.created": {
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

      case "user.updated": {
        const userData = {
          email: data.email_addresses[0]?.email_address,
          name: `${data.first_name} ${data.last_name}`,
          imageUrl: data.image_url,
        };
        await User.findByIdAndUpdate(data.id, userData, { new: true });
        console.log("♻️ User updated");
        break;
      }

      case "user.deleted": {
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

import Stripe from "stripe";
import Purchase from "../models/purchase.js";
import Course from "../models/course.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log("Webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;
      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });

      const { purchaseId } = session.data[0].metadata;

      const purchaseData = await Purchase.findById(purchaseId);

      const userData = await User.findById(purchaseData.userId);
      const courseData = await Course.findById(
        purchaseData.courseId.toString()
      );

      courseData.enrolledStudents.push(userData);
      await courseData.save();

      userData.enrolledStudents.push(courseData._id);
      await userData.save();

      purchaseData.status = "completed";
      await purchaseData.save();

      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;
      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });

      const { purchaseId } = session.data[0].metadata;
      const purchaseData = await Purchase.findById(purchaseId);
      purchaseData.status = "failed";
      await purchaseData.save();

      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).send({ received: true });
};
