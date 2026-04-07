// Script d'initialisation MongoDB
// Créer la base de données et un utilisateur avec les bonnes permissions

db = db.getSiblingDB('audit');

// Créer un utilisateur pour l'application
db.createUser({
  user: 'auditapp',
  pwd: 'audit_password_change_me',
  roles: [
    {
      role: 'readWrite',
      db: 'audit'
    }
  ]
});

// Créer les collections avec validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'name', 'password', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          description: 'Email requis et doit être une string'
        },
        name: {
          bsonType: 'string',
          description: 'Nom requis'
        },
        password: {
          bsonType: 'string',
          description: 'Mot de passe hashé requis'
        },
        role: {
          enum: ['admin', 'auditor'],
          description: 'Rôle doit être admin ou auditor'
        },
        isActive: {
          bsonType: 'bool',
          description: 'Statut actif/inactif'
        }
      }
    }
  }
});

db.createCollection('audits', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['auditorId', 'dateExecution', 'categories', 'status'],
      properties: {
        auditorId: {
          bsonType: 'objectId',
          description: 'ID de l\'auditeur requis'
        },
        dateExecution: {
          bsonType: 'string',
          description: 'Date d\'exécution requise'
        },
        status: {
          enum: ['in_progress', 'completed'],
          description: 'Statut requis'
        }
      }
    }
  }
});

// Créer les index pour les performances
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

db.audits.createIndex({ auditorId: 1 });
db.audits.createIndex({ dateExecution: -1 });
db.audits.createIndex({ status: 1 });
db.audits.createIndex({ createdAt: -1 });
db.audits.createIndex({ auditorId: 1, status: 1 });

print('✅ Base de données audit initialisée avec succès !');
