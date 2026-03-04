import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anrenapp.anren',
  appName: 'anren',
  webDir: 'dist',
  // Production: app serves bundled assets from dist/. For dev hot-reload, uncomment server block and point url to your preview.
  // server: {
  //   url: 'https://0a7e4764-598a-41d4-8621-3c2b0280a390.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  ios: {
    contentInset: 'automatic',
  },
  plugins: {
    Contacts: {
      // iOS will prompt for permission automatically
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
