import 'expo-router/entry';

import Constants, { ExecutionEnvironment } from 'expo-constants';

// Android home-screen / lock-screen widget handler. Only in custom builds:
// Expo Go doesn't ship react-native-android-widget, so it is never required there.
if (process.env.EXPO_OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./src/widgets/android');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // native module not linked (e.g. plugin disabled) — app keeps working without widgets
  }
}
