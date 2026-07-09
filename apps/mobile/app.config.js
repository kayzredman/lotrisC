/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      ...(projectId ? { eas: { projectId } } : {}),
    },
  },
};
