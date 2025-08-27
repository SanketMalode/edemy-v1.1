import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './config/mongodb.js'
import { clerkWebhooks, stripeWebhooks } from './controllers/webhooks.js'
import educatorRouter from './router/educatorRoute.js'
import { clerkMiddleware } from '@clerk/express'
import connectCloudinary from './config/cloudinary.js'
import courseRouter from './router/courseRotue.js'
import userRouter from './router/userRoute.js'

// Initialize Express
const app = express()
 connectCloudinary();

// Middlewares
app.use(cors())
app.use(clerkMiddleware())
// Routes
app.get('/', (req, res) => res.send("API Working"))
app.post('/clerk', express.json(), clerkWebhooks);
app.use('/api/educator', express.json(), educatorRouter);
app.use('/api/course', express.json(), courseRouter);
app.use('/api/user', express.json(), userRouter);
app.post('/stripe', express.raw({type:'application/json'}), stripeWebhooks);


// Port
const PORT = process.env.PORT || 5000
connectDB().then(
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
}))
