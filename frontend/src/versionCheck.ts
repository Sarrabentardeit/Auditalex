/**
 * Détecte un nouveau déploiement (buildId dans /version.json) et recharge l’onglet.
 * En dev (import.meta.env.DEV), désactivé.
 */
const STORAGE_KEY = 'audit_app_build_id';

const POLL_MS = 5 * 60 * 1000;

export function startVersionCheck(): void {
  if (import.meta.env.DEV) {
    return;
  }

  let checking = false;

  async function check(): Promise<void> {
    if (checking) return;
    checking = true;
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { buildId?: string };
      const buildId = data.buildId;
      if (!buildId || buildId === 'dev-local') {
        return;
      }

      const prev = sessionStorage.getItem(STORAGE_KEY);
      if (prev === null) {
        sessionStorage.setItem(STORAGE_KEY, buildId);
        return;
      }
      if (prev !== buildId) {
        sessionStorage.setItem(STORAGE_KEY, buildId);
        window.location.reload();
      }
    } catch {
      // hors ligne ou erreur réseau : ignorer
    } finally {
      checking = false;
    }
  }

  void check();
  window.setInterval(() => void check(), POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void check();
    }
  });
}
