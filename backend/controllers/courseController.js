import Course from "../models/course.js";

// Get All Published Courses
export const getAllCourse = async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .select(['-courseContent', '-enrolledStudents']) // Exclude large/secure fields
      .populate({ path: 'educator' });

    res.json({ success: true, courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// Get Course by ID (and hide private lecture URLs)
export const getCourseById = async (req, res) => {
  const { id } = req.params;

  try {
    const courseData = await Course.findById(id).populate({ path: 'educator' });

    if (!courseData) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Sanitize lectures: hide URLs if not previewable
    courseData.courseContent.forEach(chapter => {
      chapter.chapterContent.forEach(lecture => {
        if (!lecture.isPreviewFree) {
          lecture.lectureUrl = "";
        }
      });
    });

    res.json({ success: true, courseData });

  } catch (error) {
    console.error("Error in getCourseById:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
