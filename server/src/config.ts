import dotenv from 'dotenv';

// Load environment variables
const result = dotenv.config();

if (result.error) {
  throw result.error;
}

// Export environment variables with proper typing
interface Config {
  PORT: string | number;
  RESEND_API_KEY: string;
  // Add other env variables here
}

export const config: Config = {
  PORT: process.env.PORT || 8000,
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  // Add other env variables here
};