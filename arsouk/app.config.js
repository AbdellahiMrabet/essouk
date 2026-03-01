import 'dotenv/config';

export default {
  expo: {
    name: "سوق",
    slug: "arsouk-app"
    ,
    "extra": {
      "eas": {
        "projectId": "c99d9f77-a402-4d7d-abcf-554a4a95e844"
      }
    },
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.krdevsolutions.arsouk",
      icon: "./assets/ios-icon.png"  // Optional: specific iOS icon
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#007bff"  // Your brand color
      },
      package: "com.krdevsolutions.arsouk",
      icon: "./assets/android-icon.png"  // Optional: legacy Android icon
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#ffffff",
          "resizeMode": "contain"
        }
      ],
      "expo-secure-store"
    ]
  }
};