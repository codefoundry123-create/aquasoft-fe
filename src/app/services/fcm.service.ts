import { Injectable } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';

@Injectable({
    providedIn: 'root',
})
export class FCMService {
    public isFirebaseEnabled = false;

    /**
     * Initialize Push Notifications:
     */
    async initializePushNotifications() {
        this.setupNotificationListeners();
        PushNotifications.checkPermissions().then((permStatus) => {
            if (permStatus && permStatus.receive === 'prompt') {
                PushNotifications.requestPermissions().then((permission) => {
                    if (permission && permission.receive !== 'granted') {
                        return;
                    }
                }).catch(() => {});
            }
        }).catch(() => {});

        await PushNotifications.register().then(() => {
            PushNotifications.getDeliveredNotifications();
        }).catch(() => {});

    }

    /**
     * Set up all listeners related to push notifications
     */
    setupNotificationListeners() {
        PushNotifications.addListener('registration', (token: any) => { });

        PushNotifications.addListener('registrationError', err => { });

        PushNotifications.addListener('pushNotificationReceived', (notification: any) => { });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => { });

    }
}
