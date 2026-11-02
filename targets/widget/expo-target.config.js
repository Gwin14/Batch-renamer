/**
 * iOS WidgetKit extension: home-screen widgets, lock-screen widgets and an iOS 18 control
 * (Control Center / lock-screen button). Built by @bacons/apple-targets on `expo prebuild`;
 * Expo Go ignores this folder entirely.
 * @type {import('@bacons/apple-targets/app.plugin').ConfigFunction}
 */
module.exports = (config) => ({
  type: 'widget',
  name: 'LoteWidget',
  displayName: 'Lote',
  icon: '../../assets/icon.png',
  deploymentTarget: '18.0',
  colors: {
    $accent: { light: '#D9480F', dark: '#FF7A33' },
    $widgetBackground: { light: '#FFFFFF', dark: '#1C1C1E' },
    LoteAccent: { light: '#D9480F', dark: '#FF7A33' },
    LoteAccentSoft: { light: '#FCE9E0', dark: '#3A2116' },
    LoteBackground: { light: '#FFFFFF', dark: '#1C1C1E' },
  },
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
