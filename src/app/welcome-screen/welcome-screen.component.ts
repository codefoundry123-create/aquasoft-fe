import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { environment } from 'src/environments/environment';
import { LoggerService } from '../services/analytic.service';
import { Router } from '@angular/router';
import { RemoteService } from '../services/remote.service';
import { SharedUtilService } from '../services/shared-util.service';
import { AdmobService } from '../services/admob.service';
import { filter, firstValueFrom, Subscription } from 'rxjs';
import { LoaderService } from '../services/loader.service';
import { AppStorageService } from '../services/app-storage.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-welcome-screen',
  templateUrl: './welcome-screen.component.html',
  styleUrls: ['./welcome-screen.component.scss'],
  standalone: true,
  imports: [ CommonModule, IonicModule, TranslateModule, FormsModule ],
})
export class WelcomeScreenComponent implements OnInit, OnDestroy {
  appName = environment.AppName;
  isPremiumPlan: boolean = false;
  isOnline: boolean = true;
  nativeAdSkeleton = signal(false);

  activeAdsName: string = '';
  showWelcomebtn: boolean = false;
  splashAdFailedToLoad: boolean = true;
  interstitialAdSubscription$: Subscription = new Subscription();
  nativeAdSubscription$: Subscription = new Subscription();
  appOpenAdSubscription$: Subscription = new Subscription();

  constructor(
    private loggerService: LoggerService,
    private router: Router,
    private remoteService: RemoteService,
    private appStorageService: AppStorageService,
    private sharedUtilService: SharedUtilService,
    private admobService: AdmobService,
    private loaderService: LoaderService,
  ) { }

  async ngOnInit() {
    this.loggerService.setScreen("welcome", "WelcomeScreen");
    this.loggerService.track('welcome_screen');
    // Decide network immediately (no race)
    this.isOnline = navigator.onLine;

    // Listen for changes (UI updates only)
    this.sharedUtilService.getNetworkStatus()
      .subscribe(isOnline => {
        this.isOnline = isOnline;
      });

    await firstValueFrom(this.remoteService.ready$.pipe(filter(ready => ready === true)));
    // Load landing logic
    await this.loadLandingData();

    setTimeout(() => {
      this.showWelcomebtn = true;
    }, 14000);
  }

  ngAfterViewInit() {
    const video: HTMLVideoElement = document.querySelector('.logo video')!;
    if (video) {
      video.addEventListener('loadeddata', () => {
        video.classList.add('ready');
        video.play();   // ensure autoplay
      });
    }
  }

  private async loadLandingData() {
    // Premium check
    this.isPremiumPlan = await this.appStorageService.get<boolean>('isPremiumPlan', false).catch(() => false);

    if (this.isPremiumPlan) {
      this.showWelcomebtn = true;
      return;
    }

    if (!this.isOnline) {
      return;
    }

    this.appStorageService.get<any>('AdsControler', "").then((AdsIdControl: any) => {

      this.sharedUtilService.setScreen("welcome");

      // native ad load
      if (AdsIdControl &&
        AdsIdControl?.welcome_Ads?.ads_native_welcome_id
        && AdsIdControl?.welcome_Ads?.ads_native_welcome_ad
      ) {
        this.showNativeAdLoad(AdsIdControl);
      }

      // splash Ads (AppOpenAd)
      if (AdsIdControl &&
        AdsIdControl?.splash_Ads?.ads_splash_ad
        && AdsIdControl?.splash_Ads?.ads_splash_app_open_id
        && AdsIdControl?.splash_Ads?.ad_type == "1"
      ) {
        this.preAppOpenAdLoad(AdsIdControl);
      }

      // splash Ads (Interstitial)
      if (AdsIdControl &&
        AdsIdControl?.splash_Ads?.ads_splash_ad
        && AdsIdControl?.splash_Ads?.ads_splash_inter_id
        && AdsIdControl?.splash_Ads?.ad_type == "2"
      ) {
        this.preInterstitialAd(AdsIdControl);
      }
    }).catch(() => { });

  }
  /**
   * App Open ad pre-load
   * @param AdsIdControl
   */
  preAppOpenAdLoad(AdsIdControl: any) {
    this.activeAdsName = 'AppOpenAd';
    this.appOpenAdListeners();
    this.admobService.loadAppOpenAd(AdsIdControl?.splash_Ads?.ads_splash_app_open_id).then((loaded) => {
      this.splashAdFailedToLoad = !loaded;
      this.showWelcomebtn = true;
    }).catch(()=>{
      this.splashAdFailedToLoad = true;
    });
  }

  /**
   * Native ad pre-load
   * @param AdsIdControl 
   */
  async showNativeAdLoad(AdsIdControl: any) {
    this.nativeAdListener();

    this.nativeAdSkeleton.set(true);

    this.appStorageService.get('userId', '').then((userID)=>{
      const timeoutParam = !userID ? 0 : 10000;
      this.admobService.loadNativeAd(AdsIdControl?.welcome_Ads?.ads_native_welcome_id, timeoutParam).then((res) => {
        if (res == null) {
          this.nativeAdSkeleton.set(false);
          return;
        }
  
        this.admobService.showNativeAd(res.adId, 'WelcomeAdId', 'welcome_medium_native').catch(()=>{}).finally(()=>{
           this.nativeAdSkeleton.set(false);
        });
  
      }).catch(() => {
         this.nativeAdSkeleton.set(false);

        });
    }).catch(()=>{});

  }

  /**
   * pre-initialize Interstitial ad
   * @param AdsIdControl 
   */
  preInterstitialAd(AdsIdControl: any) {
    this.activeAdsName = 'Interstitial';
    this.InterstitialAdListeners();
    this.admobService.preloadSplashInterstitialAd(AdsIdControl?.splash_Ads?.ads_splash_inter_id, 'Welcome_Component').then((loadAd) => {
      this.splashAdFailedToLoad = !loadAd;
      this.showWelcomebtn = true;
    }).catch(()=>{
      this.splashAdFailedToLoad = true;
    });
  }

  /**
 * Interstitial ad listener
 */
  InterstitialAdListeners() { /** @Todo => Remove Ads Listeners  */
    this.interstitialAdSubscription$ = this.admobService.adMobInterstitialStatus$.subscribe((InterstitalStatus) => {
      this.loggerService.track(`Spalsh_Interstital_Ad_${InterstitalStatus}`);
      if (['Dismissed', 'FailedToShow'].includes(InterstitalStatus) && this.router.url == '/welcome') {
        this.goToNextScreen();
        // Unsubscribe to avoid repeated triggers
        this.interstitialAdSubscription$?.unsubscribe();
      }
    });
  }

  /**
 * Interstitial ad listener
 */
  appOpenAdListeners() { /** @Todo => Remove Ads Listeners  */
    this.appOpenAdSubscription$ = this.admobService.AppOpenAdStatus$.subscribe((AppOpenAdStatus) => {
      this.loggerService.track(`Spalsh_appOpen_Ad_${AppOpenAdStatus}`);
      if (['adDismissed', 'adFailedToShow'].includes(AppOpenAdStatus) && this.router.url == '/welcome') {
        this.goToNextScreen();
        // Unsubscribe to avoid repeated triggers
        this.appOpenAdSubscription$?.unsubscribe();
      }
    });
  }

  /**
 * native ad Listener
 */
  nativeAdListener() {
    this.nativeAdSubscription$ = this.admobService.NativeAdStatus$.subscribe((NativeAdStatus: any) => {
        this.loggerService.track(`Spalsh_Native_Ad_${NativeAdStatus?.status}`);
    });
  }

  onContinue() {
    this.loggerService.track('Continue_welcome_button_clicked');

    if (this.isPremiumPlan) {
      this.goToNextScreen();
      return;
    }

    this.loaderService.show(true);
    if (this.splashAdFailedToLoad) {
      this.loaderService.hide();
      this.goToNextScreen();
    } else {
      if (this.activeAdsName === 'Interstitial') {
        this.hideNativeAd();
        this.admobService.showSplashInterstitialAds('welcome_screen').then(()=>{
          this.loaderService.hide();
        }).catch(()=>{
          this.goToNextScreen();
        });
      }

      if (this.activeAdsName === 'AppOpenAd') {
        this.hideNativeAd();
        this.admobService.showAppOpenAd().then(() => {
          this.loaderService.hide();
        }).catch(()=>{
          this.goToNextScreen();
        });
      }
    }
  }

  /**
   * Go to language Screen
   */
  goToNextScreen() {
    this.router.navigate(['/language'], {
      queryParams: { source: 'welcome' },
    });
  }

  hideNativeAd() {
    this.appStorageService.get('currentNativeLoadID', '').then((currentNativeLoadID) => {
      if (currentNativeLoadID && currentNativeLoadID != null) {
        this.admobService.removeNativeAd(currentNativeLoadID);
        this.appStorageService.remove("currentNativeLoadID");
      };
    }).catch(() => { });
  }

  ngOnDestroy(): void {
    this.loggerService.track('welcome_screen_destroy');
    if (!this.isPremiumPlan) {
      // Native ad remove
      this.hideNativeAd();
      // unsubscribe Listeners
      this.nativeAdSubscription$?.unsubscribe();
      this.interstitialAdSubscription$?.unsubscribe();
      this.appOpenAdSubscription$?.unsubscribe();
    }
  }
}
