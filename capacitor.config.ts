import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.waterreminderdailyfitness.app',
  appName: 'Daily Hydration Reminder',
  webDir: 'dist',
  /** Just for local development */
  // server : {
  //   androidScheme: 'https',
  //   url : 'http://192.168.31.186:4200', // local computer ipv 4
  //   cleartext : true,
  // },
  plugins : {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: "ic_notification_icon",
      iconColor: "#7DADEF",
      sound: "beep.wav"
    },
    SplashScreen: {
      launchShowDuration: 3000,
      splashFullScreen: false,
      launchFadeOutDuration: 300,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#000000',
      overlaysWebView: false
    }
  }
};

export default config;
