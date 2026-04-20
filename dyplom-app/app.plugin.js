// Custom config plugin to ensure Google Maps API keys are injected into Android manifest
// It takes the key from android.config.googleMaps.apiKey (app.json) or EXPO_GOOGLE_MAPS_API_KEY env

const {
  withAndroidManifest,
  AndroidConfig,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const withGoogleMapsMeta = (config) => {
  return withAndroidManifest(config, (config) => {
    const apiKey =
      config.android?.config?.googleMaps?.apiKey ||
      process.env.EXPO_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY;
      console.log('[app.plugin.js] running, apiKey=', config.android?.config?.googleMaps?.apiKey);
    if (!apiKey) {
      console.warn(
        '[app.plugin.js] Google Maps API key not found in android.config.googleMaps.apiKey or env.'
      );
      return config;
    }

    const manifest = config.modResults;
    const app = manifest.application?.[0];
    if (!app) return config;

    const ensureMeta = (name) => {
      if (!app['meta-data']) {
        app['meta-data'] = [];
      }
      app['meta-data'] = app['meta-data'].filter(
        (item) => item.$['android:name'] !== name
      );
      app['meta-data'].push({
        $: {
          'android:name': name,
          'android:value': apiKey,
        },
      });
    };

    ensureMeta('com.google.android.geo.API_KEY');

    return config;
  });
};

const plugin = createRunOncePlugin(withGoogleMapsMeta, 'withGoogleMapsMeta', '1.0.0');
module.exports = plugin;
module.exports.default = plugin;

