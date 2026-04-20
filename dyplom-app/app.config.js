require('dotenv').config();

module.exports = ({ config }) => {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY || '';

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: mapsKey,
        },
      },
    },
    plugins: (config.plugins || []).map((plugin) => {
      if (Array.isArray(plugin) && plugin[0] === 'expo-maps') {
        return [
          'expo-maps',
          {
            apiKey: {
              android: mapsKey,
              ios: mapsKey,
            },
          },
        ];
      }
      return plugin;
    }),
  };
};




