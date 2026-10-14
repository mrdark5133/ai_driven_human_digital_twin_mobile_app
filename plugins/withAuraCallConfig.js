const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to configure Android MainActivity with showWhenLocked and turnScreenOn
 * so incoming call notifications can open the app over the lock screen.
 */
module.exports = function withAuraCallConfig(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application?.[0];
    if (!mainApplication || !mainApplication.activity) return config;

    const mainActivity = mainApplication.activity.find(
      (a) => a['$']?.['android:name'] === '.MainActivity'
    );

    if (mainActivity) {
      mainActivity['$']['android:showWhenLocked'] = 'true';
      mainActivity['$']['android:turnScreenOn'] = 'true';
    }

    return config;
  });
};
