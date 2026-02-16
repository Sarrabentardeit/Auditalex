import Dexie, { type Table } from 'dexie';
import type { User } from '../types';

class UserDatabase extends Dexie {
  users!: Table<User, string>;

  constructor() {
    super('AuditUserDB');
    this.version(1).stores({
      users: 'id, email, role, isActive',
    });
  }
}

const db = new UserDatabase();

export async function saveUser(user: User): Promise<void> {
  await db.users.put(user);
}

export async function getUser(id: string): Promise<User | undefined> {
  return await db.users.get(id);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return await db.users.where('email').equals(email.toLowerCase()).first();
}

export async function getAllUsers(): Promise<User[]> {
  return await db.users.toArray();
}

export async function getUsersByRole(role: 'admin' | 'auditor'): Promise<User[]> {
  return await db.users.where('role').equals(role).toArray();
}

export async function deleteUser(id: string): Promise<void> {
  await db.users.delete(id);
}

// Initialiser un compte admin par défaut si aucun n'existe
export async function initializeDefaultAdmin(): Promise<void> {
  const users = await getAllUsers();
  const hasAdmin = users.some(u => u.role === 'admin');
  
  if (!hasAdmin) {
    // Créer un compte admin par défaut
    // Email: admin@audit.com
    // Password: admin123 (À CHANGER en production!)
    const defaultAdmin: User = {
      id: crypto.randomUUID(),
      email: 'admin@audit.com',
      name: 'Administrateur',
      role: 'admin',
      password: btoa('admin123'), // Hash simple (temporaire)
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await saveUser(defaultAdmin);
    console.log('Compte admin par défaut créé: admin@audit.com / admin123');
  }
}



