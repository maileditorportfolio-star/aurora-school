import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, roleHome } from '@/store/auth';
import { api, setToken } from '@/lib/api';
import type { User } from '@/types';

vi.mock('@/lib/api', () => ({
  api: {
    auth: {
      login: vi.fn(),
      me: vi.fn(),
    },
  },
  setToken: vi.fn(),
}));

const user: User = {
  id: 'user-1',
  name: 'Naim Khan',
  email: 'student@aurora.school',
  phone: null,
  role: 'STUDENT',
  permissions: [],
  avatarUrl: null,
};

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isLoading: true, error: null });
    vi.mocked(api.auth.login).mockReset();
    vi.mocked(api.auth.me).mockReset();
    vi.mocked(setToken).mockReset();
  });

  it('roleHome routes each role to the right console', () => {
    expect(roleHome('SUPER_ADMIN')).toBe('/admin');
    expect(roleHome('ADMIN')).toBe('/admin');
    expect(roleHome('TEACHER')).toBe('/teacher');
    expect(roleHome('STUDENT')).toBe('/portal');
    expect(roleHome('PARENT')).toBe('/portal');
    expect(roleHome(undefined)).toBe('/admin');
  });

  it('signs in and keeps the API token in sync', async () => {
    vi.mocked(api.auth.login).mockResolvedValue({ user, token: 'jwt-token' });

    await useAuthStore.getState().login('student@aurora.school', 'aurora123');

    expect(useAuthStore.getState()).toMatchObject({
      user,
      token: 'jwt-token',
      isLoading: false,
      error: null,
    });
    expect(setToken).toHaveBeenCalledWith('jwt-token');
  });

  it('surfaces a login error and clears loading', async () => {
    vi.mocked(api.auth.login).mockRejectedValue(new Error('Invalid email or password'));

    await expect(useAuthStore.getState().login('bad@aurora.school', 'x')).rejects.toThrow();
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().error).toBe('Invalid email or password');
  });

  it('logout clears the session and the token', () => {
    useAuthStore.setState({ user, token: 'jwt-token', isLoading: false, error: null });

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    expect(setToken).toHaveBeenCalledWith(null);
  });

  it('hydrate revalidates the session and stores the user', async () => {
    vi.mocked(api.auth.me).mockResolvedValue({ user });

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('hydrate clears the session when the token is invalid', async () => {
    vi.mocked(api.auth.me).mockRejectedValue(new Error('401'));
    useAuthStore.setState({ user, token: 'stale', isLoading: true, error: null });

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
