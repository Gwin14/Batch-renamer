/** Data mirrored to home-screen / lock-screen widgets (iOS App Group, Android widget renderer). */
export interface WidgetSnapshot {
  totalRenamed: number;
  batches: number;
  lastLabel: string;
  lastAt: number;
  lastCount: number;
  quickPresetName: string;
  favorites: { id: string; name: string }[];
  pendingFiles: number;
  updatedAt: number;
}

export const EMPTY_SNAPSHOT: WidgetSnapshot = {
  totalRenamed: 0,
  batches: 0,
  lastLabel: '',
  lastAt: 0,
  lastCount: 0,
  quickPresetName: 'Fotos por data',
  favorites: [],
  pendingFiles: 0,
  updatedAt: 0,
};
