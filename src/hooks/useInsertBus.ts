import { create } from 'zustand';

/** Lets the Variables screen insert a token into whichever field is active in the rule editor. */
export const useInsertBus = create<{ token: string | null; seq: number; emit: (t: string) => void; consume: () => void }>((set) => ({
  token: null,
  seq: 0,
  emit: (token) => set((s) => ({ token, seq: s.seq + 1 })),
  consume: () => set({ token: null }),
}));
