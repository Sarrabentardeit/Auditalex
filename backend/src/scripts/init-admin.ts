import { connectDatabase, closeDatabase } from '../config/mongodb';
import { User } from '../models/User.model';
import { hashPassword } from '../utils/password';
import { logger } from '../utils/logger';

async function initAdmin() {
  try {
    // Connect to database
    await connectDatabase();

    const email = 'admin@audit.com';
    const password = 'admin123';
    const name = 'Administrateur';

    // Check if admin already exists
    const existing = await User.findOne({ email });

    if (existing) {
      logger.info('Admin user already exists');
      await closeDatabase();
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin user
    const admin = await User.create({
      email,
      name,
      passwordHash,
      role: 'admin',
      isActive: true,
    });
    
    // Utiliser admin pour éviter l'erreur de variable non utilisée
    console.log('Admin user created:', admin.email);

    logger.info('Admin user created successfully');
    logger.info(`Email: ${email}`);
    logger.info(`Password: ${password}`);
    logger.info('⚠️  Please change the default password in production!');

    await closeDatabase();
  } catch (error) {
    logger.error('Failed to initialize admin user:', error);
    await closeDatabase();
    process.exit(1);
  }
}

// Run if called directly
initAdmin();
