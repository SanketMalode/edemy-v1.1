import express from 'express';
import { getUserData, purchaseCourse, userEnrolledCourses } from '../controllers/userController.js';

const userRouter = express.Router();

// Get basic user info
userRouter.get('/data', getUserData);

// Get all enrolled courses with lecture access based on preview
userRouter.get('/enrolled-courses', userEnrolledCourses);
userRouter.post('/purchase', purchaseCourse);

export default userRouter;
