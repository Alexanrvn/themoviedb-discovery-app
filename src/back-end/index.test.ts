import { describe, it, expect, beforeAll } from 'vitest';

describe('back-end server routes', () => {
  beforeAll(async () => {
    // Démarrer le serveur dans le contexte du test
    try {
      await import('./index');
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch {
      // On ignore l'erreur si le port est déjà utilisé
    }
  }); // <-- C'est cette ligne qui manquait !

  describe('server setup', () => {
    describe('server listening', () => {
      it('starts the server on port 3000', async () => {
        const response = await fetch('http://localhost:3000/');
        expect(response).toBeDefined();
      });
    });
  });

  describe('route registration', () => {
    it('registers the /api/movies/popular route', async () => {
      const response = await fetch('http://localhost:3000/api/movies/popular');
      // On vérifie que la route existe (pas d'erreur 404)
      expect(response.status).not.toBe(404);
    });

    it('registers the /api/health route', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      expect(response.status).toBe(200);
    });
  });
});
