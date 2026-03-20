const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve('react-native-crypto'),
  util: require.resolve('util'),
  net: require.resolve('react-native-tcp'),
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('buffer'),
  events: require.resolve('events'),
  path: require.resolve('path-browserify'),
  zlib: require.resolve('browserify-zlib'),
  url: require.resolve('url'),
  http: require.resolve('@tradle/react-native-http'),
  https: require.resolve('https-browserify'),
  os: require.resolve('react-native-os'),
  fs: require.resolve('react-native-level-fs'),
  tls: false,
  // Stubs for GramJS's StoreSession dead-code path (we use StringSession only)
  'node-localstorage': require.resolve('./src/shims/node-localstorage.js'),
  'asyncstorage-down': require.resolve('./src/shims/asyncstorage-down.js'),
};

module.exports = withNativeWind(config, { input: "./global.css" });
