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
  },
};

export default config;
