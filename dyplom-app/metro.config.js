const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Исключаем папку backend из обработки Metro bundler
config.resolver = config.resolver || {};
config.resolver.blockList = [
  // Исключаем все файлы из папки backend
  /backend[/\\].*/,
  // Исключаем node_modules из backend
  /backend[/\\]node_modules[/\\].*/,
];

// Также исключаем backend из watchFolders
config.watchFolders = config.watchFolders || [];
config.watchFolders = config.watchFolders.filter(
  (folder) => !folder.includes('backend')
);

// Исключаем backend из sourceExts если нужно
config.resolver.sourceExts = config.resolver.sourceExts || [];

module.exports = config;

