import express, { Request, Response } from "express";
import dotenv from "dotenv";
import userRoutes from './routes/auth.route.js'
import emailRoutes from './routes/email.route.js'
import cors from 'cors'
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
app.use(express.json());
const port = process.env.PORT || 8000;

const corsOptions = {
  origin: 'http://localhost:3000', // Replace with your Next.js frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
  credentials: true, // Allow cookies if needed
};

app.use(cors(corsOptions));

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.use(cookieParser())

app.use("/api", userRoutes);
app.use("/api", emailRoutes);