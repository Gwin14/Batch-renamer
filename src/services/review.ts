import { isWeb } from '@/services/env';

/** Completed-batch counts at which we ask for a rating (the system also limits how often it shows). */
const ASK_AT = new Set([1, 10, 40]);

/** Asks for an App Store / Play rating at a happy moment: right after a batch finished without errors. */
export function maybeRequestReview(batches: number, hadErrors: boolean) {
  if (isWeb || hadErrors || !ASK_AT.has(batches)) return;
  setTimeout(async () => {
    try {
      const StoreReview = await import('expo-store-review');
      if (await StoreReview.isAvailableAsync()) await StoreReview.requestReview();
    } catch {
      // Rating prompts are best-effort.
    }
  }, 1500);
}
