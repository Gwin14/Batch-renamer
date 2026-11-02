import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { newId } from '@/services/fs';

import { storage } from './storage';

export interface HistoryOp {
  id: string;
  fromName: string;
  toName: string;
  /** original folder */
  folderUri: string;
  /** final folder (differs when "Organizar em pastas" was used) */
  destFolderUri: string;
  /** current location after the batch */
  uri: string;
}

export interface HistoryBatch {
  id: string;
  at: number;
  label: string;
  presetId: string | null;
  ops: HistoryOp[];
  failed: number;
  undoneAt: number | null;
}

interface HistoryState {
  batches: HistoryBatch[];
  add: (batch: Omit<HistoryBatch, 'id' | 'at' | 'undoneAt'>) => HistoryBatch;
  markUndone: (id: string, restored: { id: string; uri: string }[]) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const LIMIT = 60;

export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      batches: [],
      add: (input) => {
        const batch: HistoryBatch = { ...input, id: newId(), at: Date.now(), undoneAt: null };
        set((s) => ({ batches: [batch, ...s.batches].slice(0, LIMIT) }));
        return batch;
      },
      markUndone: (id, restored) =>
        set((s) => ({
          batches: s.batches.map((b) => {
            if (b.id !== id) return b;
            const map = new Map(restored.map((r) => [r.id, r.uri]));
            return { ...b, undoneAt: Date.now(), ops: b.ops.map((o) => ({ ...o, uri: map.get(o.id) ?? o.uri })) };
          }),
        })),
      remove: (id) => set((s) => ({ batches: s.batches.filter((b) => b.id !== id) })),
      clear: () => set({ batches: [] }),
    }),
    { name: 'lote.history', storage, version: 1 },
  ),
);

export function totalRenamed(batches: HistoryBatch[]) {
  return batches.filter((b) => !b.undoneAt).reduce((n, b) => n + b.ops.length, 0);
}
