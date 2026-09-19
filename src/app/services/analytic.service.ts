import { Injectable } from '@angular/core';
import { FirebaseAnalytics } from "@capacitor-community/firebase-analytics";

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
 public isFirebaseEnabled = false;

  constructor() {
    this.initFirebase();
  }

  /**
   * Initialises Firebase event logging
   */
  initFirebase() {
      FirebaseAnalytics.setCollectionEnabled({ enabled: true }).then(()=>{
        this.isFirebaseEnabled = true;
      }).catch(()=>{
        this.isFirebaseEnabled = false;
      });
  }

  /**
   * Logs event
   * @param event event Name
   * @param properties
   */
  track(event: string, properties?: any) {
    if (this.isFirebaseEnabled) { FirebaseAnalytics.logEvent({ name: event, params: properties || {} }); }
  }

  /**
   * Identify logs for a specfic user/device id
   * @param userId
   */
  identify(userId: string) {
    if (this.isFirebaseEnabled) { FirebaseAnalytics.setUserId({ userId: userId }) };
  }

  /**
   * Sets the current screen name
   * @param screenName name of the current screen to track
   * @param nameOverride name of the screen to override default screen name in Firebase Analytics.
   */
  setScreen(screenName: string, nameOverride: string) {
    if (this.isFirebaseEnabled) {
      FirebaseAnalytics.setScreenName({
        screenName: screenName,
        nameOverride: nameOverride
      });
    }
  }
}
