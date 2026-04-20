const React = require('react');
const { Text } = require('react-native');

module.exports = {
  Ionicons: ({ name, color }) => React.createElement(Text, null, `${name}-${color}`),
};







