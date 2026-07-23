import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  email?: string;
  isAdmin: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isInitialized: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setInitialized: (val: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isInitialized: false,
      isAuthenticated: false,
      setUser: (user) => set({ user, isInitialized: true }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken, isAuthenticated: true }),
      setInitialized: (val) => set({ isInitialized: val }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'eden-auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

interface DropEditState {
  editingDropId: number | null;
  isCreating: boolean;
  startCreate: () => void;
  startEdit: (id: number) => void;
  cancel: () => void;
}

export const useDropEditStore = create<DropEditState>((set) => ({
  editingDropId: null,
  isCreating: false,
  startCreate: () => set({ isCreating: true, editingDropId: null }),
  startEdit: (id) => set({ editingDropId: id, isCreating: false }),
  cancel: () => set({ editingDropId: null, isCreating: false }),
}));

interface ActivityState {
  activities: { id: number; text: string; time: Date }[];
  addActivity: (text: string) => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  activities: [],
  addActivity: (text) => set((state) => ({
    activities: [{ id: Date.now(), text, time: new Date() }, ...state.activities].slice(0, 50),
  })),
}));
