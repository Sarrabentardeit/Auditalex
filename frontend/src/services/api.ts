/**
 * Service API pour communiquer avec le backend
 * Gestion centralisée de toutes les requêtes HTTP
 */

import { logger } from '../utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export class ApiError extends Error {
  status: number;
  data?: any;
  
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Récupérer le token JWT depuis localStorage
 */
function getAuthToken(): string | null {
  try {
    return localStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Sauvegarder le token JWT dans localStorage
 */
function setAuthToken(token: string): void {
  try {
    localStorage.setItem('authToken', token);
  } catch (error) {
    console.error('Error setting auth token:', error);
  }
}

/**
 * Supprimer le token JWT
 */
function removeAuthToken(): void {
  try {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  } catch (error) {
    console.error('Error removing auth token:', error);
  }
}

/**
 * Faire une requête HTTP avec gestion d'erreurs professionnelle
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    logger.api(`${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(30000), // Timeout de 30 secondes
    });

    // Gérer les réponses non-JSON (comme 204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    let data: any;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new ApiError(
        response.status,
        text || `HTTP error! status: ${response.status}`,
        { text }
      );
    }

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `HTTP error! status: ${response.status}`;
      logger.error(`[API] Error ${response.status}:`, errorMessage, data);
      
      // Si erreur 401, déconnecter l'utilisateur (sauf pour /auth/login où c'est normal)
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        removeAuthToken();
        // Ne pas rediriger si on est déjà sur la page de login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      
      // Messages d'erreur plus clairs pour le login
      if (endpoint.includes('/auth/login')) {
        if (response.status === 401) {
          throw new ApiError(
            response.status,
            'Email ou mot de passe incorrect',
            data
          );
        }
        if (response.status === 403) {
          throw new ApiError(
            response.status,
            'Compte désactivé. Contactez l\'administrateur.',
            data
          );
        }
      }
      
      throw new ApiError(
        response.status,
        errorMessage,
        data
      );
    }

    logger.api(`Success ${response.status}`);
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      logger.error('[API] Network error - Backend may be down');
      throw new ApiError(
        0,
        'Impossible de se connecter au serveur. Vérifiez que le backend est démarré.',
        { originalError: error.message }
      );
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'La requête a expiré. Veuillez réessayer.');
    }
    
    throw new ApiError(
      500,
      error instanceof Error ? error.message : 'Erreur réseau inconnue',
      { originalError: error }
    );
  }
}

/**
 * API d'authentification
 */
export const authApi = {
  /**
   * Se connecter
   */
  async login(email: string, password: string) {
    try {
      const response = await request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      
      if (response && response.token) {
        setAuthToken(response.token);
        logger.log('[API] Login successful');
      }
      
      return response;
    } catch (error) {
      logger.error('[API] Login failed:', error);
      throw error;
    }
  },

  /**
   * Se déconnecter
   */
  logout(): void {
    removeAuthToken();
    logger.log('[API] Logged out');
  },

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isAuthenticated(): boolean {
    return !!getAuthToken();
  },

  /**
   * Obtenir le token actuel
   */
  getToken(): string | null {
    return getAuthToken();
  },

  /**
   * Récupérer l'utilisateur connecté (vérifie le token côté backend)
   */
  async getMe() {
    return request<{ id: string; email: string; name: string; role: string }>('/auth/me');
  },
};

/**
 * API des utilisateurs (Admin uniquement)
 */
export const userApi = {
  /**
   * Récupérer tous les utilisateurs
   */
  async getAllUsers() {
    return request<{ users: any[] }>('/users');
  },

  /**
   * Récupérer un utilisateur par ID
   */
  async getUserById(id: string) {
    return request<any>(`/users/${id}`);
  },

  /**
   * Créer un utilisateur
   */
  async createUser(userData: {
    email: string;
    name: string;
    password: string;
    role: 'admin' | 'auditor';
  }) {
    return request<any>('/users', {
      method: 'POST',
      body: JSON.stringify({
        ...userData,
        email: userData.email.trim().toLowerCase(),
      }),
    });
  },

  /**
   * Modifier un utilisateur
   */
  async updateUser(id: string, updates: Partial<{
    email: string;
    name: string;
    password: string;
    role: 'admin' | 'auditor';
    isActive: boolean;
  }>) {
    const cleanUpdates: any = { ...updates };
    if (cleanUpdates.email) {
      cleanUpdates.email = cleanUpdates.email.trim().toLowerCase();
    }
    
    return request<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanUpdates),
    });
  },

  /**
   * Supprimer un utilisateur
   */
  async deleteUser(id: string) {
    return request<void>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Activer/désactiver un utilisateur
   */
  async toggleUserActive(id: string) {
    return request<any>(`/users/${id}/toggle-active`, {
      method: 'PATCH',
    });
  },
};

/**
 * API des audits
 */
export const auditApi = {
  /**
   * Récupérer tous les audits
   */
  async getAllAudits() {
    const response = await request<{ audits: any[] } | any[]>('/audits');
    // Le backend retourne { audits: [...] }
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object' && 'audits' in response) {
      return (response as { audits: any[] }).audits;
    }
    return [];
  },

  /**
   * Récupérer un audit par ID
   */
  async getAuditById(id: string) {
    return request<any>(`/audits/${id}`);
  },

  /**
   * Créer un audit
   */
  async createAudit(auditData: {
    dateExecution: string;
    adresse?: string;
    categories: any[];
    correctiveActions?: any[];
  }) {
    return request<any>('/audits', {
      method: 'POST',
      body: JSON.stringify(auditData),
    });
  },

  /**
   * Modifier un audit
   */
  async updateAudit(id: string, updates: Partial<{
    dateExecution: string;
    adresse?: string;
    categories: any[];
    correctiveActions?: any[];
    status?: 'draft' | 'in_progress' | 'completed' | 'archived';
    completedAt?: string;
  }>) {
    return request<any>(`/audits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Supprimer un audit
   */
  async deleteAudit(id: string) {
    return request<void>(`/audits/${id}`, {
      method: 'DELETE',
    });
  },
};

export { getAuthToken, setAuthToken, removeAuthToken };
