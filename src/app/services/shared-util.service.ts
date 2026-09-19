import { Injectable } from '@angular/core';
import { fromEvent, map, Observable, of, BehaviorSubject, merge } from "rxjs";
import { ToastController } from '@ionic/angular';
import { Share } from '@capacitor/share';
import { environment } from 'src/environments/environment';
import { Capacitor } from '@capacitor/core';


@Injectable({
  providedIn: 'root'
})
export class SharedUtilService {
  networkStatus$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  platform: string = '';
  appName = environment.AppName;

  constructor(
    private toastController: ToastController
  ) { }

  private currentScreen = 'none';

  setScreen(name: string) {
    this.currentScreen = name;
  }

  getScreen(): string {
    return this.currentScreen;
  }

  /**
   * Displays a success message in a toast notification.
   * @param {string} message - The success message to display.
   */
  async showToaster(message: string, position: 'top' | 'middle' | 'bottom' = 'bottom', icon: string = 'information-circle-outline') {
    const toast = await this.toastController.create({
      message: message,
      duration: 1500,
      mode: 'ios',
      position: position,
      icon: icon,
    });

    await toast.present();
  }

  /**
     * CHeck internet funcation
     */
    checkNetworkStatus() {
      merge(
        of(null),
        fromEvent(window, 'online'),
        fromEvent(window, 'offline')
      ).pipe(map(() => navigator.onLine)).subscribe((isOnline: boolean) => {
        this.networkStatus$.next(isOnline);
      });
    }
  
    /**
      * check internet Status
      */
    public getNetworkStatus(): Observable<boolean> {
      return this.networkStatus$;
    }

     /**
   * Show a Share modal for sharing content with other apps
   * @param url App url
   * @param files Downloaded files (audio, video)
   * @returns Promise<boolean>
   */
  shareContent(options?: { title?: string; text?: string; dialogTitle?: string; }): Promise<boolean> {
    return new Promise((resolve) => {
      this.platform = Capacitor.getPlatform();

      const shareOptions = {
        dialogTitle: options?.dialogTitle || this.appName,
        title: options?.title || `Stay Hydrated "${this.appName}".`,
        text: options?.text || `Stay Hydrated "${this.appName}"`,
        url: this.platform === 'ios' ? environment.ios : environment.android,
      };

      Share.share(shareOptions)
        .then(() => resolve(true))
        .catch(() => resolve(false));
    });
  }
}

