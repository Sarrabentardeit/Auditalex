import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

// Load environment variables first
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 
  process.env.MONGO_URI ||
  process.env.DATABASE_URL || 
  'mongodb://localhost:27017/audit_db';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
  }
}

