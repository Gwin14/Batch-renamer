import * as Haptics from 'expo-haptics';

import { isWeb } from './env';

let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

const run = (fn: () => Promise<void>) => {
  if (!enabled || isWeb) return;
  fn().catch(() => {});
};

/** Haptics are punctuation: one per user action, on the same frame as the visual. */
export const haptics = {
  /** value passed a step (segmented, stepper, toggle) */
  selection: () => run(() => Haptics.selectionAsync()),
  /** something snapped into place (reorder drop, chip added) */
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** heavier commit (apply started) */
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  rigid: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
