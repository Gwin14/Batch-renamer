/**
 * Lote Pro via RevenueCat (entitlement "pro", offering "default").
 * In Expo Go the SDK runs in Preview API Mode (mocked, no real purchases); on web there is no store,
 * so every Pro feature stays unlocked there to keep the web build usable for development.
 */
import { tr } from '@/i18n';
import { isAndroid, isIOS, isWeb } from '@/services/env';
import { haptics } from '@/services/haptics';
import { toast } from '@/ui/Toast';
import { create } from 'zustand';

const API_KEYS = {
  ios: 'appl_sYeQiMniAVwJftOTIsNWNpTGpUp',
  android: 'goog_CtVQalvQXVKruzVoQnDceNRmDJj',
};
export const PRO_ENTITLEMENT = 'pro';

/** Free-tier limits. */
export const FREE_LIMITS = { filesPerBatch: 20, savedPresets: 3, undoableBatches: 3 };

export const usePro = create<{ isPro: boolean; ready: boolean }>(() => ({ isPro: isWeb, ready: isWeb }));

type CustomerInfoLike = { entitlements: { active: Record<string, unknown> } };
const applyInfo = (info: CustomerInfoLike) => usePro.setState({ isPro: PRO_ENTITLEMENT in info.entitlements.active, ready: true });

let starting: Promise<void> | null = null;

/** Configures RevenueCat once and keeps `usePro` in sync with the customer's entitlements. */
export function initPurchases() {
  if (isWeb) return Promise.resolve();
  starting ??= start();
  return starting;
}

async function start() {
  try {
    const { default: Purchases, LOG_LEVEL } = await import('react-native-purchases');
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
    const apiKey = isIOS ? API_KEYS.ios : isAndroid ? API_KEYS.android : null;
    if (!apiKey) return;
    Purchases.configure({ apiKey });
    Purchases.addCustomerInfoUpdateListener(applyInfo);
    applyInfo(await Purchases.getCustomerInfo());
  } catch (e) {
    if (__DEV__) console.warn('[Lote Pro] RevenueCat não iniciou. O build nativo inclui react-native-purchases?', e);
    usePro.setState({ ready: true });
  }
}

const isPro = () => usePro.getState().isPro;

/** Shows the Lote Pro paywall. Resolves true when the user ends up with Pro. */
export async function showPaywall(): Promise<boolean> {
  if (isPro()) return true;
  try {
    const { default: RevenueCatUI, PAYWALL_RESULT } = await import('react-native-purchases-ui');
    const result = await RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: PRO_ENTITLEMENT, displayCloseButton: true });
    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      usePro.setState({ isPro: true });
      haptics.success();
      toast(tr('Lote Pro ativado. Obrigado!'), { tone: 'success' });
      return true;
    }
    if (result === PAYWALL_RESULT.NOT_PRESENTED) {
      // The SDK found an active "pro" entitlement.
      usePro.setState({ isPro: true });
      return true;
    }
    if (result === PAYWALL_RESULT.ERROR) toast(tr('Não foi possível abrir a loja. Tente de novo.'), { tone: 'error' });
    return isPro();
  } catch (e) {
    if (__DEV__) console.warn('[Lote Pro] Falha ao abrir o paywall', e);
    toast(tr('Não foi possível abrir a loja. Tente de novo.'), { tone: 'error' });
    return false;
  }
}

/** Gate for a Pro feature: passes immediately for Pro users, otherwise explains and shows the paywall. */
export async function requirePro(reason: string): Promise<boolean> {
  // Cold launches (widget, shortcut) can reach a gate before the entitlement has loaded.
  if (!usePro.getState().ready) await initPurchases();
  if (isPro()) return true;
  toast(reason, { tone: 'info' });
  return showPaywall();
}

export async function restorePurchases() {
  if (isWeb) return;
  try {
    const { default: Purchases } = await import('react-native-purchases');
    const info = await Purchases.restorePurchases();
    applyInfo(info);
    if (isPro()) {
      haptics.success();
      toast(tr('Lote Pro restaurado'), { tone: 'success' });
    } else toast(tr('Nenhuma compra encontrada nesta conta'), { tone: 'info' });
  } catch {
    toast(tr('Não foi possível restaurar. Tente de novo.'), { tone: 'error' });
  }
}

/** Opens RevenueCat's Customer Center (manage, cancel, refund requests). */
export async function manageSubscription() {
  try {
    const { default: RevenueCatUI } = await import('react-native-purchases-ui');
    await RevenueCatUI.presentCustomerCenter();
  } catch {
    toast(tr('Não foi possível abrir a loja. Tente de novo.'), { tone: 'error' });
  }
}
