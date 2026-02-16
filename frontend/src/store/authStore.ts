import { create } from 'zustand';
import type { User, UserRole } from '../types';
import { authApi, userApi, ApiError } from '../services/api';
import { logger } from '../utils/logger';

interface AuthState {
  currentUser: User | null;
  users: User[];
  isAuthenticated: boolean;

  // Actions d'authentification
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;

  // Actions de gestion des utilisateurs (admin uniquement)
  createUser: (email: string, name: string, password: string, role: UserRole) => Promise<boolean>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  toggleUserActive: (userId: string) => Promise<boolean>;
  loadAllUsers: () => Promise<void>;
  
  // Vérifications
  isAdmin: () => boolean;
  isAuditor: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  users: [],
  isAuthenticated: false,

  login: async (email, password) => {
    try {
      if (!email || !password) {
        logger.error('[AuthStore] Email ou mot de passe manquant');
        return false;
      }

      logger.log('[AuthStore] Tentative de connexion pour:', email);
      const response = await authApi.login(email.trim(), password);
      
      // Logger la réponse pour le debug
      logger.log('[AuthStore] Réponse reçue:', response);
      
      // Gérer deux formats de réponse possibles :
      // Format 1: {token, user} (notre backend)
      // Format 2: {success, message, data: {id, email, firstName, lastName}} (autre backend)
      let userData: any = null;
      let token: string | null = null;
      
      const responseAny = response as any; // Type assertion pour gérer les deux formats
      
      logger.log('[AuthStore] Analyse de la réponse:', JSON.stringify(responseAny, null, 2));
      
      if (responseAny && responseAny.user && responseAny.token) {
        // Format 1: Notre backend
        userData = responseAny.user;
        token = responseAny.token;
        logger.log('[AuthStore] Format 1 détecté (notre backend)');
      } else if (responseAny && responseAny.success && responseAny.data) {
        // Format 2: Autre backend - adapter le format
        logger.log('[AuthStore] Format 2 détecté (autre backend), data complet:', JSON.stringify(responseAny.data, null, 2));
        
        // Vérifier que data contient bien les champs nécessaires
        if (!responseAny.data.id || !responseAny.data.email) {
          logger.error('[AuthStore] Données incomplètes dans response.data:', responseAny.data);
          throw new Error('Données utilisateur incomplètes dans la réponse');
        }
        
        userData = {
          id: responseAny.data.id,
          email: responseAny.data.email,
          name: responseAny.data.name || (responseAny.data.firstName && responseAny.data.lastName 
            ? `${responseAny.data.firstName} ${responseAny.data.lastName}`.trim()
            : responseAny.data.email?.split('@')[0] || 'Utilisateur'), // Utiliser name si disponible, sinon firstName+lastName, sinon email
          role: responseAny.data.role || 'auditor', // Utiliser le rôle si disponible
        };
        // Pour l'autre backend, le token pourrait être dans response.token, response.data.token, ou response.data.accessToken
        token = responseAny.token || responseAny.data.token || responseAny.data.accessToken || null;
        logger.log('[AuthStore] Token extrait:', token ? 'Oui' : 'Non');
        logger.log('[AuthStore] userData créé:', userData);
      }
      
      // Si on a les données utilisateur, continuer même sans token (on créera un token temporaire)
      if (userData) {
        logger.log('[AuthStore] userData valide, traitement de la connexion...');
        // Si pas de token mais qu'on a les données, créer un token factice ou utiliser l'ID comme token
        if (!token) {
          logger.warn('[AuthStore] Aucun token trouvé, utilisation de l\'ID comme token');
          token = `temp_${userData.id}`; // Utiliser l'ID comme token temporaire avec préfixe
        }
        // Convertir la réponse API en format User
        const user: User = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role || 'auditor',
          password: '', // Ne pas stocker le mot de passe
          isActive: userData.isActive !== undefined ? userData.isActive : true,
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: userData.updatedAt || new Date().toISOString(),
        };
        
        // Sauvegarder le token si disponible
        if (token) {
          try {
            localStorage.setItem('authToken', token);
          } catch (e) {
            logger.warn('[AuthStore] Impossible de sauvegarder le token:', e);
          }
        }
        
        // Sauvegarder l'utilisateur dans localStorage pour checkAuth
        try {
          localStorage.setItem('currentUser', JSON.stringify(user));
        } catch (e) {
          logger.warn('[AuthStore] Impossible de sauvegarder dans localStorage:', e);
        }
        
        set({ 
          currentUser: user, 
          isAuthenticated: true 
        });
        
        logger.log('[AuthStore] Connexion réussie pour:', user.name);
        return true;
      } else {
        logger.error('[AuthStore] Aucune donnée utilisateur trouvée dans la réponse');
      }
      
      logger.error('[AuthStore] Réponse de connexion invalide:', response);
      return false;
    } catch (error) {
      logger.error('[AuthStore] Erreur lors de la connexion:', error);
      if (error instanceof ApiError) {
        logger.error('[AuthStore] Erreur API:', error.status, error.message, error.data);
        // Propager l'erreur pour que l'UI puisse afficher le message approprié
        throw error;
      }
      return false;
    }
  },

  logout: () => {
    authApi.logout();
    set({ 
      currentUser: null, 
      isAuthenticated: false 
    });
  },

  checkAuth: async () => {
    if (!authApi.isAuthenticated()) {
      set({ 
        currentUser: null, 
        isAuthenticated: false 
      });
      return;
    }

    const token = authApi.getToken();
    if (!token) {
      set({ currentUser: null, isAuthenticated: false });
      return;
    }

    // Vérifier le token côté backend et récupérer l'utilisateur (ID correct pour les audits)
    try {
      const userData = await authApi.getMe();
      if (userData && userData.id) {
        const user: User = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role as UserRole,
          password: '',
          isActive: true,
          createdAt: '',
          updatedAt: '',
        };
        try {
          localStorage.setItem('currentUser', JSON.stringify(user));
        } catch (e) {
          logger.warn('[AuthStore] Impossible de sauvegarder currentUser:', e);
        }
        set({ currentUser: user, isAuthenticated: true });
        logger.log('[AuthStore] Utilisateur vérifié via /auth/me:', user.id);
      } else {
        authApi.logout();
        set({ currentUser: null, isAuthenticated: false });
      }
    } catch (e) {
      // Token invalide ou backend indisponible, fallback localStorage
      logger.warn('[AuthStore] Vérification du token échouée, utilisation du localStorage:', e);
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          set({ currentUser: user, isAuthenticated: true });
        } catch {
          authApi.logout();
          set({ currentUser: null, isAuthenticated: false });
        }
      } else {
        authApi.logout();
        set({ currentUser: null, isAuthenticated: false });
      }
    }
  },

  createUser: async (email, name, password, role) => {
    const { currentUser } = get();
    
    // Vérifier que l'utilisateur actuel est admin
    if (!currentUser || currentUser.role !== 'admin') {
      return false;
    }

    try {
      const user = await userApi.createUser({ email, name, password, role });
      
      if (user) {
        await get().loadAllUsers();
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Erreur lors de la création de l\'utilisateur:', error);
      if (error instanceof ApiError) {
        logger.error('Erreur API:', error.status, error.message);
      }
      return false;
    }
  },

  updateUser: async (userId, updates) => {
    const { currentUser } = get();
    
    // Vérifier que l'utilisateur actuel est admin
    if (!currentUser || currentUser.role !== 'admin') {
      return false;
    }

    try {
      // Préparer les updates pour l'API (exclure les champs internes)
      const apiUpdates: any = {};
      if (updates.email !== undefined) apiUpdates.email = updates.email;
      if (updates.name !== undefined) apiUpdates.name = updates.name;
      if (updates.password !== undefined) apiUpdates.password = updates.password;
      if (updates.role !== undefined) apiUpdates.role = updates.role;
      if (updates.isActive !== undefined) apiUpdates.isActive = updates.isActive;

      const user = await userApi.updateUser(userId, apiUpdates);
      
      if (user) {
        await get().loadAllUsers();
        
        // Si l'utilisateur modifié est l'utilisateur actuel, mettre à jour
        if (userId === currentUser.id) {
          const updatedUser: User = {
            ...currentUser,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          set({ currentUser: updatedUser });
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      if (error instanceof ApiError) {
        logger.error('Erreur API:', error.status, error.message);
      }
      return false;
    }
  },

  deleteUser: async (userId) => {
    const { currentUser } = get();
    
    // Vérifier que l'utilisateur actuel est admin
    if (!currentUser || currentUser.role !== 'admin') {
      return false;
    }

    // Ne pas permettre la suppression de son propre compte
    if (userId === currentUser.id) {
      return false;
    }

    try {
      await userApi.deleteUser(userId);
      await get().loadAllUsers();
      return true;
    } catch (error) {
      logger.error('Erreur lors de la suppression de l\'utilisateur:', error);
      if (error instanceof ApiError) {
        logger.error('Erreur API:', error.status, error.message);
      }
      return false;
    }
  },

  toggleUserActive: async (userId) => {
    const { currentUser } = get();
    
    // Vérifier que l'utilisateur actuel est admin
    if (!currentUser || currentUser.role !== 'admin') {
      return false;
    }

    // Ne pas permettre la désactivation de son propre compte
    if (userId === currentUser.id) {
      return false;
    }

    try {
      const user = await userApi.toggleUserActive(userId);
      
      if (user) {
        await get().loadAllUsers();
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Erreur lors de la modification du statut de l\'utilisateur:', error);
      if (error instanceof ApiError) {
        logger.error('Erreur API:', error.status, error.message);
      }
      return false;
    }
  },

  loadAllUsers: async () => {
    const { currentUser } = get();
    
    // Seul l'admin peut charger tous les utilisateurs
    if (!currentUser || currentUser.role !== 'admin') {
      return;
    }

    try {
      const response = await userApi.getAllUsers();
      const users: User[] = response.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        password: '', // Ne pas stocker le mot de passe
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));
      
      set({ users });
    } catch (error) {
      logger.error('Erreur lors du chargement des utilisateurs:', error);
      if (error instanceof ApiError) {
        logger.error('Erreur API:', error.status, error.message);
      }
    }
  },

  isAdmin: () => {
    const { currentUser } = get();
    return currentUser?.role === 'admin';
  },

  isAuditor: () => {
    const { currentUser } = get();
    return currentUser?.role === 'auditor';
  },
}));
