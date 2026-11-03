import Constants, { ExecutionEnvironment } from 'expo-constants';

/** True when running inside the Expo Go client (no custom native code available). */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const isWeb = process.env.EXPO_OS === 'web';
export const isIOS = process.env.EXPO_OS === 'ios';
export const isAndroid = process.env.EXPO_OS === 'android';

/** Native-only integrations (widgets, quick actions, share extension) need a dev/production build. */
export const hasCustomNative = !isExpoGo && !isWeb;

export const APP_GROUP = 'group.com.fabiosantos.lote';
export const APP_SCHEME = 'lote';
