import Course from "../models/course.js";
import User from "../models/user.js";
import Purchase from "../models/purchase.js";
import Stripe from "stripe";

// Get Authenticated User's Basic Data
export const getUserData = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findById(userId).select("-password -__v");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Enrolled Courses for a User with Filtered Lecture URLs
export const userEnrolledCourses = async (req, res) => {
  try {
    const userId = req.auth.userId;

    const userData = await User.findById(userId).populate({
      path: "enrolledCourses",
      populate: {
        path: "educator",
        select: "name",
      },
    });

    if (!userData) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }

    const enrolledCourses = userData.enrolledCourses.map((course) => {
      const filteredContent = course.courseContent.map((chapter) => {
        const lectures = chapter.chapterContent.map((lecture) => ({
          ...lecture.toObject(),
          lectureUrl: lecture.isPreviewFree ? lecture.lectureUrl : "",
        }));

        return {
          ...chapter.toObject(),
          chapterContent: lectures,
        };
      });

      return {
        _id: course._id,
        courseTitle: course.courseTitle,
        courseDescription: course.courseDescription,
        courseThumbnail: course.courseThumbnail,
        educator: course.educator,
        courseContent: filteredContent,
      };
    });

    res.json({ success: true, enrolledCourses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const purchaseCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const { origin } = req.headers;
    const userId = req.auth.userId;
    const userData = await User.findById(userId);
    const courseData = await Course.findById(courseId);

    if (!userData || !courseData) {
      return res.json({ success: false, message: "Data Not Found" });
    }

    const purchaseData = {
      courseId: courseData._id,
      userId,
      amount: (
        courseData.coursePrice -
        (courseData.discount * courseData.coursePrice) / 100
      ).toFixed(2),
    };

    const newPurchase = await Purchase.create(purchaseData);

    // Stripe Gateway Initialize
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

    const currency = process.env.CURRENCY.toLowerCase();

    // Creating line items to for Stripe
    const line_items = [
      {
        price_data: {
          currency,
          product_data: {
            name: courseData.courseTitle,
          },
          unit_amount: Math.floor(newPurchase.amount) * 100,
        },
        quantity: 1,
      },
    ];

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-enrollments`,
      cancel_url: `${origin}/`,
      line_items: line_items,
      mode: "payment",
      metadata: {
        purchaseId: newPurchase._id.toString(),
      },
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Update User Course Progress
export const updateUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId, lectureId } = req.body;
    const progressData = await CourseProgress.findOne({ userId, courseId });

    if (progressData) {
      if (progressData.lectureCompleted.includes(lectureId)) {
        return res.json({
          success: true,
          message: "Lecture Already Completed",
        });
      }

      progressData.lectureCompleted.push(lectureId);
      await progressData.save();
    } else {
      await CourseProgress.create({
        userId,
        courseId,
        lectureCompleted: [lectureId],
      });
    }

    res.json({ success: true, message: "Progress Updated" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId, lectureId } = req.body;
    const progressData = await CourseProgress.findOne({ userId, courseId });

    res.json({ success: true, progressData });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

//Add user Rating
export const addUserRating = async (req, res) => {
  const userId = req.auth.userId;
  const { courseId, rating } = req.body;

  // Validate input
  if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
    return res.json({ success: false, message: "Invalid Details" });
  }

  try {
    // Find course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.json({ success: false, message: "Course not found." });
    }

    // Find user and check enrollment
    const user = await User.findById(userId);
    if (!user || !user.enrolledCourses.includes(courseId)) {
      return res.json({
        success: false,
        message: "User has not purchased this course.",
      });
    }

    // Check if user has already rated
    const existingRatingIndex = course.courseRatings.findIndex(
      (r) => r.userId === userId
    );

    if (existingRatingIndex > -1) {
      // Update existing rating
      course.courseRatings[existingRatingIndex].rating = rating;
    } else {
      // Add new rating
      course.courseRatings.push({ userId, rating });
    }

    // Save course with updated rating
    await course.save();

    return res.json({ success: true, message: "Rating added" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
