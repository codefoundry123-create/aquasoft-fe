import { Injectable } from "@angular/core";
import { FirebaseRemoteConfig } from '@capacitor-firebase/remote-config';
import { environment } from "src/environments/environment";
import { AppStorageService } from "./app-storage.service";
import { BehaviorSubject } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class RemoteService {
     private readySubject = new BehaviorSubject<boolean>(false);
     ready$ = this.readySubject.asObservable();
  
    public AdsControler: any = '';
    constructor(private appStorageService: AppStorageService) {
        FirebaseRemoteConfig.removeAllListeners();
    }

    /**
     * Initializes the AdsController configuration
     */
    async init() {
        const now = Date.now();
        const lastFetch: any = await this.appStorageService.get<number>("LastAdsControlerData", 0).catch(() => {});
        const lastFetchTime = lastFetch ? JSON.parse(lastFetch) : 0;
        const elapsedTime = now - lastFetchTime;
        const isFirstInstall = lastFetchTime === 0;
        const is24hPassed = elapsedTime > 20 * 1000;

        if (isFirstInstall || is24hPassed) {            
            await this.firebaseRemotework(now);
        } else {
            const cached: any = await this.appStorageService.get<string>("AdsControler", "").catch(() => {});
            if (cached) {
                this.AdsControler = JSON.parse(cached);
                this.readySubject.next(true);
            }
        }

    }

    /**
     * init firebase remote-config
     */
    async firebaseRemotework(currentTime: number) {
        try {

            await FirebaseRemoteConfig.setSettings({
                minimumFetchIntervalInSeconds: environment.production ? 3600 : 0
            });

            // Fetch and activate config
            await FirebaseRemoteConfig.fetchAndActivate();

            const version = '1_1_109'; // app_version
            const dynamicParam = `${environment.production ? 'release_config' : 'debugg_config'}_${version}`;
            // Get values
            const adsConfig = await FirebaseRemoteConfig.getString({ key: dynamicParam });

            if (adsConfig.value) {
                this.AdsControler = JSON.parse(adsConfig.value);
                this.appStorageService.set('LastAdsControlerData', currentTime.toString());
                this.appStorageService.set<any>("AdsControler", this.AdsControler)
            }
        } catch (error) {
            return;
        }

         this.readySubject.next(true); // Notify listeners
    }
}
