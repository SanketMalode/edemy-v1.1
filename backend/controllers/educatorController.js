import { clerkClient } from "@clerk/express";
import Course from "../models/course.js"; // Adjust path as needed
import { v2 as cloudinary } from "cloudinary";

//update role to educator
export const updateRoleToEducator = async (req, res) => {
  try {
    const userId = req.auth.userId;

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: "educator",
      },
    });

    res.json({ success: true, message: "You can publish a course now" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const addCourse = async (req, res) => {
  try {
    const courseData = req.body.courseData;
    const imageFile = req.file;
    const educatorId = req.auth.userId;

    if (!imageFile) {
      return res.json({ success: false, message: "Thumbnail not attached" });
    }

    // // Upload thumbnail to Cloudinary
    // const cloudinaryResponse = await cloudinary.uploader.upload(imageFile.path, {
    //   folder: 'course-thumbnails',
    // });

    // // Parse course data from JSON string (e.g., if sent via FormData)
    // const parsedCourseData = JSON.parse(courseData);
    // parsedCourseData.educator = educatorId;
    // parsedCourseData.courseThumbnail = cloudinaryResponse.secure_url;

    const parsedCourseData = JSON.parse(courseData); // Removed unnecessary await
    parsedCourseData.educator = educatorId;

    const newCourse = await Course.create(parsedCourseData); // Added 'const' and '='

    const imageUpload = await cloudinary.uploader.upload(imageFile.path); // Added 'const' and '='

    newCourse.courseThumbnail = imageUpload.secure_url; // Fixed property assignment

    await newCourse.save();

    res.json({ success: true, message: "Course Added" });

    // // Create course in DB
    // const newCourse = await Course.create(parsedCourseData);

    // res.json({
    //   success: true,
    //   message: "Course created successfully",
    //   data: newCourse,
    // });
  } catch (error) {
    console.error("Error adding course:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while adding course" });
  }
};


// Get Educator Courses
export const getEducatorCourses = async (req, res) => {
  try {
    const educator = req.auth.userId;

    const courses = await Course.find({ educator });

    res.json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const educatorDashboardData = async (req, res) => {
  try {
    const educator = req.auth.userId;

    // Fetch all courses by educator
    const courses = await Course.find({ educator });
    const totalCourses = courses.length;

    const courseIds = courses.map(course => course._id);

    // Calculate total earnings from completed purchases
    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: 'completed'
    });

    const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

    // Fetch enrolled students data
    const enrolledStudentsData = [];

    for (const course of courses) {
      const students = await User.find(
        { _id: { $in: course.enrolledStudents } },
        'name imageUrl'
      );

      students.forEach(student => {
        enrolledStudentsData.push({
          courseTitle: course.courseTitle,
          student
        });
      });
    }

    // Send dashboard response
    res.json({
      success: true,
      dashboardData: {
        totalCourses,
        totalEarnings,
        enrolledStudentsData
      }
    });

  } catch (error) {
    console.error("Error in educator dashboard:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// Get Enrolled Students Data with Purchase Info
export const getEnrolledStudentsData = async (req, res) => {
  try {
    const educator = req.auth.userId;

    // Find all courses by the educator
    const courses = await Course.find({ educator });
    const courseIds = courses.map(course => course._id);

    // Find completed purchases for those courses
    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: 'completed'
    })
      .populate('userId', 'name imageUrl')       // Populate student info
      .populate('courseId', 'courseTitle');      // Populate course title

    // Format enrolled student data
    const enrolledStudents = purchases.map(purchase => ({
      student: purchase.userId,
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt
    }));

    // Send the response
    res.json({ success: true, enrolledStudents });

  } catch (error) {
    console.error('Error fetching enrolled students:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
