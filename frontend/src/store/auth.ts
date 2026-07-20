import { create } from 'zustand';

export interface User {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  isAdmin: boolean;
}

interface AuthState {
  user: User | null;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setInitialized: (val: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitialized: false,
  setUser: (user) => set({ user, isInitialized: true }),
  setInitialized: (val) => set({ isInitialized: val }),
  logout: () => set({ user: null }),
}));

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
