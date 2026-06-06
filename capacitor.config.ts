import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "rsvp.echelon.app",
  appName: "Echelon",
  webDir: "dist",
  server: {
    url: "https://echelon.rsvp/app/",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#FCF6FA",
      showSpinner: false,
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId:
        "73520219376-5bvlfjlkuejnega5r9h5nqiu84r1s9si.apps.googleusercontent.com",
      iosClientId: process.env.GOOGLE_IOS_CLIENT_ID || undefined,
    },
  },
};

export default config;
