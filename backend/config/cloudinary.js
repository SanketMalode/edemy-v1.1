import { v2 as cloudinary } from 'cloudinary';

// Optional: Only if using environment variables from a .env file
import dotenv from 'dotenv';
dotenv.config();

const connectCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
  });
};

export default connectCloudinary;
