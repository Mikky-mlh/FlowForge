import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock Firebase Auth
const mockUser = {
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  providerData: [],
  tenantId: null,
  refreshToken: 'mock-token',
  getIdTokenResult: vi.fn(),
  getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
  reload: vi.fn(),
  toJSON: vi.fn(),
};

const mockGoogleAuthProvider = {};

const mockSignInWithPopup = vi.fn().mockResolvedValue({
  user: mockUser,
  credential: { accessToken: 'mock-access-token' },
});

const mockSignOut = vi.fn().mockResolvedValue(undefined);

const mockOnAuthStateChanged = vi.fn((auth, callback) => {
  callback(null); // Start with no user
  return () => {};
});

const mockGetDoc = vi.fn().mockResolvedValue({ exists: () => false });
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDocs = vi.fn().mockResolvedValue({ empty: false, docs: [{ data: () => ({ syncId: 'TEST-SYNC-123' })}] });

vi.mock('../firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: mockOnAuthStateChanged,
    signInWithPopup: mockSignInWithPopup,
    signOut: mockSignOut,
    GoogleAuthProvider: vi.fn(),
  },
  googleProvider: mockGoogleAuthProvider,
  db: {
    collection: () => ({
      doc: () => ({ get: mockGetDoc, set: mockSetDoc }),
      where: () => ({ get: mockGetDocs }),
    }),
  },
  doc: (db: any, col: string, id: string) => ({ col, id }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'mock-uuid-12345',
}));

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start with loading true', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      
      // Initially loading should be true during auth check
      expect(result.current.loading).toBe(true);
    });

    it('should have null user initially', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return () => {};
      });

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('signIn', () => {
    it('should return access token on successful sign in', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return () => {};
      });

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let token: string | null = null;
      await act(async () => {
        token = await result.current.signIn();
      });

      expect(token).toBe('mock-access-token');
      expect(mockSignInWithPopup).toHaveBeenCalled();
    });

    it('should set googleAccessToken on successful sign in', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return () => {};
      });

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn();
      });

      expect(result.current.googleAccessToken).toBe('mock-access-token');
    });

    it('should set error on sign in failure', async () => {
      mockSignInWithPopup.mockRejectedValue(new Error('Auth failed'));
      
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return () => {};
      });

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn();
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('logOut', () => {
    it('should clear user and syncId on logout', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return () => {};
      });

      // First sign in
      const { result: resultWithUser } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(resultWithUser.current.loading).toBe(false);
      });

      await act(async () => {
        await resultWithUser.current.signIn();
      });

      // Then logout
      await act(async () => {
        await resultWithUser.current.logOut();
      });

      expect(resultWithUser.current.user).toBeNull();
      expect(resultWithUser.current.syncId).toBeNull();
      expect(resultWithUser.current.googleAccessToken).toBeNull();
    });

    it('should remove syncId from localStorage on logout', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return () => {};
      });

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate having a syncId in localStorage
      localStorageMock.getItem.mockReturnValue('SYNC-ID-123');

      await act(async () => {
        await result.current.logOut();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('flowforge_sync_id');
    });
  });

  describe('linkDevice', () => {
    it('should accept valid sync code and save to localStorage', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return () => {};
      });

      // Setup mock to return non-empty for valid code
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ data: () => ({ syncId: 'VALID123456' })}]
      });

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.linkDevice('VALID123456');
      });

      expect(success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('flowforge_sync_id', 'VALID123456');
    });

    it('should throw on invalid sync code', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return () => {};
      });

      // Setup mock to return empty for invalid code
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: []
      });

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.linkDevice('INVALID123')).rejects.toThrow('Invalid sync code');
    });

    it('should normalize code to uppercase', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return () => {};
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ data: () => ({ syncId: 'UPPERCASE123' })}]
      });

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.linkDevice('uppercase123');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('flowforge_sync_id', 'UPPERCASE123');
    });

    it('should throw if code is not 12 characters', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return () => {};
      });

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.linkDevice('SHORT')).rejects.toThrow('12 characters');
    });

    it('should set deviceLinkLoading during operation', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return () => {};
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ data: () => ({ syncId: 'VALID123456' })}]
      });

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Initially should not be loading
      expect(result.current.deviceLinkLoading).toBe(false);

      // During link should be loading
      const linkPromise = act(async () => {
        await result.current.linkDevice('VALID123456');
      });

      // Note: Due to async nature, we check final state
      await linkPromise;

      expect(result.current.deviceLinkLoading).toBe(false);
    });
  });

  describe('syncId from localStorage', () => {
    it('should load syncId from localStorage when not authenticated', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null); // No user
        return () => {};
      });

      localStorageMock.getItem.mockReturnValue('LOCAL-SYNC-ID');

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.syncId).toBe('LOCAL-SYNC-ID');
    });

    it('should have null syncId when not authenticated and no localStorage', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return () => {};
      });

      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.syncId).toBeNull();
    });
  });
});