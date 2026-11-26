export type AuthMode = 'env' | 'claimed' | 'setup_required';

export interface AuthStatusResponse {
  configured: boolean;
  mode: AuthMode;
  authenticated: boolean;
}

// Strictly in-memory session Bearer token (never persisted in localStorage/sessionStorage)
let adminSessionToken: string | null = null;

export function getAdminSessionToken(): string | null {
  return adminSessionToken;
}

export async function fetchAuthStatus(): Promise<AuthStatusResponse> {
  const headers: Record<string, string> = {};
  if (adminSessionToken) {
    headers.Authorization = `Bearer ${adminSessionToken}`;
  }
  const res = await fetch('/api/auth/status', { headers });
  if (!res.ok) {
    throw new Error('Gagal menyemak status pengesahan pelayan.');
  }
  const data = (await res.json()) as AuthStatusResponse;
  if (!data.authenticated) {
    adminSessionToken = null;
  }
  return data;
}

export async function setupInitialPassword(password: string): Promise<void> {
  const res = await fetch('/api/auth/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menetapkan kata laluan pentadbir.');
  }
  adminSessionToken = data.token || null;
}

export async function loginAdmin(password: string): Promise<void> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Kata laluan tidak sah.');
  }
  adminSessionToken = data.token || null;
}

export async function logoutAdmin(): Promise<void> {
  const token = adminSessionToken;
  adminSessionToken = null;
  if (!token) return;
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // ignore network errors on logout
  }
}
