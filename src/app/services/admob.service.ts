import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription, timer } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LoaderService } from './loader.service';
import { LoggerService } from './analytic.service';
import { AppStorageService } from './app-storage.service';
import { NativeAd } from '../CustomPlugin/NativeAdPlugin';
import { AppOpenAd } from '../CustomPlugin/AppOpenAd';
import interstitialAd from '../CustomPlugin/CustomAdListener';
import { InterstitialAd, InterstitialAdEvents } from '../CustomPlugin/InterstitialAd';
import { BannerAds } from '../CustomPlugin/bannerAd';

@Injectable({
  providedIn: 'root'
})
export class AdmobService {
  adMobInterstitialStatus$ = new BehaviorSubject<any>('');
  adMobBannerStatus$ = new BehaviorSubject<any>(null);
  NativeAdStatus$ = new BehaviorSubject<any>(null);
  AppOpenAdStatus$ = new BehaviorSubject<any>(null);
  public bannerAdSkeleton$ = new BehaviorSubject<boolean>(false);
  private stopBannerRefresh$: Subscription = new Subscription();
  isBannerAdStopped: boolean = false;
  isBannerAdLoaded: boolean = false;
  isIntertialAdShowing: boolean = false;
  public isAdEnabled = true;

  constructor(
    private loaderService: LoaderService,
    private appStorageService: AppStorageService,
    private loggerService: LoggerService,
  ) {

    NativeAd.addListener('onAdLoaded', (info) => { if (info) { this.NativeAdStatus$.next({ status: 'onAdLoaded', NativeId: info?.adId }) } });
    NativeAd.addListener('onAdClicked', (info) => { if (info) { this.NativeAdStatus$.next({ status: 'onAdClicked', NativeId: info?.adUnitId }) } });
    NativeAd.addListener('onAdImpression', (info) => { if (info) { this.NativeAdStatus$.next({ status: 'onAdImpression', NativeId: info?.adUnitId }) } });
    NativeAd.addListener('onAdFailed', (info) => { if (info) { this.NativeAdStatus$.next({ status: 'onAdFailed', NativeId: info?.adUnitId }) } });
    NativeAd.addListener('onNativeAdAction', (info) => { if (info) { this.NativeAdStatus$.next({ status: 'onNativeAdAction', NativeId: info }) } });

    //** App Open Ad Listener */
    AppOpenAd.addListener('adDismissed', () => this.AppOpenAdStatus$.next('adDismissed'));
    AppOpenAd.addListener('adFailedToLoad', () => this.AppOpenAdStatus$.next('adFailedToLoad'));
    AppOpenAd.addListener('adFailedToShow', () => this.AppOpenAdStatus$.next('adFailedToShow'));
    AppOpenAd.addListener('adLoaded', () => this.AppOpenAdStatus$.next('adLoaded'));
    AppOpenAd.addListener('adOpened', () => this.AppOpenAdStatus$.next('adOpened'));
    AppOpenAd.addListener('adAlreadyOpened', () => this.AppOpenAdStatus$.next('adAlreadyOpened'));
    AppOpenAd.addListener('adLoadCancelled', () => this.AppOpenAdStatus$.next('adLoadCancelled'));

  }

  async initAdMob() {
    // AdMob.initialize().then(async () => {
     const premiumValue = await this.appStorageService.get<boolean>('isPremiumPlan', false);

      this.isAdEnabled = !premiumValue;

      // this.isAdEnabled = !environment.isPremiumPlan;

      if (this.isAdEnabled) {
        /** Interstitial */
        InterstitialAd.addListener(InterstitialAdEvents.Showed, () => {
          this.loaderService.hide();
          this.adMobInterstitialStatus$.next("Showed");
          this.isIntertialAdShowing = true;
          // this.removeBannerAd();

          // handle for App open Ad
          interstitialAd.interstitial({ interstitialAdShowed: true });
        }).catch(() => { });

        InterstitialAd.addListener(InterstitialAdEvents.Dismissed, () => {
          this.loaderService.hide();
          this.adMobInterstitialStatus$.next("Dismissed");
          this.isIntertialAdShowing = false;
          // this.startBannerAdRefresh();

          // handle for App open Ad
          interstitialAd.interstitial({ interstitialAdShowed: false });
        }).catch(() => { });

        InterstitialAd.addListener(InterstitialAdEvents.FailedToLoad, () => {
          this.loaderService.hide();
          this.isIntertialAdShowing = false;
          this.adMobInterstitialStatus$.next("FailedToLoad");
        }).catch(() => { });

        InterstitialAd.addListener(InterstitialAdEvents.FailedToShow, () => {
          this.loaderService.hide();
          this.isIntertialAdShowing = false;
          this.adMobInterstitialStatus$.next("FailedToShow");
        }).catch(() => { });

        /** Banner */
        BannerAds.addListener("onAdLoaded", () => {
          this.isBannerAdLoaded = true;
          this.adMobBannerStatus$.next({ status: 'Loaded' });
        });

        BannerAds.addListener('onAdFailedToLoad', () => {
          // Sometimes Google is unable to fill ad due to ad unavailability
          this.isBannerAdLoaded = false;
          this.isBannerAdStopped = false;
          this.adMobBannerStatus$.next({ status: 'FailedToLoad' });
        });

        BannerAds.addListener('onAdOpened', () => {
          this.adMobBannerStatus$.next({ status: 'Opend' });
          // Remove banner ad on banner ad click to avoid background refresh
          this.removeBannerAd();
        });

        // this.showInterstitialAds(environment.ads.Ad_on_splash);
      }
    // }).catch(() => {
    //   this.isAdEnabled = false;
    // });
  }

  preloadSplashInterstitialAd(adId: string, componentName: string): Promise<boolean> {
    this.loggerService.track(`Interstitial_ad_call_${componentName}_Id_${adId.slice(-4)}`);

    return new Promise((resolve) => {
      if (this.isAdEnabled && !this.isIntertialAdShowing) {
        // this.loaderService.show(true);
        let options: any = { adId: adId };
        if (!environment.production) { options.isTesting = true; }

        InterstitialAd.loadAd(options).then(() => {
          this.loggerService.track(`Interstitial_ad_show_${componentName}_Id_${adId.slice(-4)}`);
          // this.loaderService.show(false);
          resolve(true); // ad shown
        }).catch(() => {
          this.loggerService.track(`Interstitial_ad_fail_${componentName}_Id_${adId.slice(-4)}`);
          // this.loaderService.show(false);
          resolve(false); // ad failed
        });
      } else {
        resolve(false); // Ad not enabled or already showing
      }
    });
  }

  /**
   * Show preloaded Interstitial Ad
   */
  async showSplashInterstitialAds(componentName: string): Promise<boolean> {
    this.loggerService.track(`Interstitial_show_request_${componentName}`);
    return new Promise((resolve) => {

      InterstitialAd.showAd().then(() => {
        resolve(true); // ad shown
      }).catch(() => {
        resolve(false); // ad failed
      });
    });
  }

  /**
   * Banner ads
   */
  showBannerAd(bannerDetails: any) {
    return new Promise((resolve) => {
      if (this.isAdEnabled) {
         let options: any = {
          adId: bannerDetails.id,
          type: bannerDetails.type,
          position: 'bottom',
          margin: bannerDetails.margin,
          collapsible: bannerDetails.collapsible
        };

        if (!environment.production) {
          options.isTesting = true;
        }

        // https://github.com/capacitor-community/admob/issues/227
        // https://github.com/capacitor-community/admob/issues/170
        // AdMob.initialize().then(() => {
          BannerAds.showBanner(options).then(() => {
            this.bannerAdSkeleton$.next(false);
            resolve(true);
          }).catch(() => {
            this.bannerAdSkeleton$.next(false);
            resolve(false);
          });
        // }).catch(() => {
        //   this.bannerAdSkeleton$.next(false);
        //   resolve(false);
        // });
      }
    });
  }

  /**
  * Hide Banner ad
  * e.g., hiding banner ad on tutorital and Player
  */
  hideBannerAd() {
    if (this.isAdEnabled && this.isBannerAdLoaded && !this.isBannerAdStopped) {
      BannerAds.hideBanner().then(() => {
        this.isBannerAdStopped = true;
      });
    }
  }

  /**
   * resume Banner ad
   */
  resumeBannerAd() {
    if (this.isAdEnabled && this.isBannerAdLoaded && this.isBannerAdStopped) {
      BannerAds.resumeBanner().then(() => {
        this.isBannerAdStopped = false;
      });
    }
  }

  /**
   * Remove existing banner ad if any available and show banner ad again.
   */
  async startBannerAdRefresh(bannerDetails: any) {
    if (this.isAdEnabled) {
      if (!this.isBannerAdStopped) {
        if (this.isBannerAdLoaded) {
          await this.removeBannerAd();
        }
        await this.showBannerAd(bannerDetails);
      }

      this.stopBannerRefresh$ = timer(30000).subscribe(() => {
        this.startBannerAdRefresh(bannerDetails);
      });
    }
  }

  /**
   * Removes banner ad completely
   */
  removeBannerAd() {
    return new Promise((resolve) => {
      if (this.stopBannerRefresh$) { this.stopBannerRefresh$.unsubscribe(); }

      if (this.isBannerAdLoaded) {
        BannerAds.removeBanner().then(() => {
          this.isBannerAdLoaded = false;
          this.isBannerAdStopped = false;
          resolve(true);
        }).catch(() => {
          resolve(false);
        });
      } else {
        resolve(true);
      }
    });
  }

  /**
   * App Open load Ads
   */
  loadAppOpenAd(Adid: string) {
    return AppOpenAd.loadAd({ adUnitId: Adid }).then(() => true).catch(() => false);
  }

  /**
   * App Open show Ads
   */
  showAppOpenAd() {
    return AppOpenAd.showAd().then(() => true).catch(() => false);
  }

    /**
   * Load Native Ad with optional timeout
   * @param adUnitId Ad unit id
   * @param timeout  timeout in ms (optional)
   * @returns 
   */
 // ...existing code...
  async loadNativeAd(adUnitId: string, timeout?: number): Promise<any | null> {

    let requestId: string | null = null;
    let timeoutId: any;
    let finished = false;

    const adLoadPromise = NativeAd.loadNativeAd({ adUnitId })
      .then((res: any) => {
        if (finished) return null; // agar already timeout ho gaya to ignore
        finished = true;
        clearTimeout(timeoutId);
        requestId = res.requestId;
        return res;
      })
      .catch((err: any) => {
        if (finished) return null;
        finished = true;
        clearTimeout(timeoutId);
        return null;
      });

    // Agar timeout diya hai to race use karo
    if (timeout && timeout > 0) {
      // race ke bajaye proper timeout control
      const timeoutPromise = new Promise(async (resolve) => {
        timeoutId = setTimeout(async () => {
          if (!finished) {
            finished = true;
            if (requestId) {
              await this.cancelNativeAdRequest(requestId);
            }
            resolve(null);
          }
        }, timeout);
      });

      // Promise.race ab theek kaam karega, kyunki flags manage ho rahe hain
      return Promise.race([adLoadPromise, timeoutPromise]);
    }

    return adLoadPromise;
  }
// ...existing code...

  /**
   * Cancel Native Ad request
   * @param requestId Request ID to cancel the ad load
   */
  async cancelNativeAdRequest(requestId: string): Promise<any> {
    try {
      await NativeAd.cancelNativeAdRequest({ requestId });
      return null;
    } catch (err) {
      return null;
    }
  }

    /**
   * Show Native Ad in specified container
   * @param adId adId from loadNativeAd response
   * @param containerId  Container element id where ad to be placed
   * @param layoutType  Layout type as per doc
   * @returns true if ad shown, false otherwise
   */
  async showNativeAd(adId: string, containerId: string, layoutType: string): Promise<boolean> {
    const container = document.getElementById(containerId);
    if (!container) return false;

    const rect: any = container.getBoundingClientRect();

    try {
      await NativeAd.showNativeAd({
        adId,
        x: Math.floor(rect.left),
        y: Math.floor(rect.top),
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
        layoutType: layoutType as any
      }).then(()=>{ }).catch(()=>{});
      this.appStorageService.set('currentNativeLoadID', adId);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Hide Native Ad
   * @param currentNativeLoadID currentNativeLoadID from localstorage
   */
  hideNativeAd(currentNativeLoadID: string) {
    NativeAd.hideNativeAd({ adId: currentNativeLoadID }).then(() => { }).catch(() => { });
  }

  /**
   * Resume Native Ad
   * @param currentNativeLoadID currentNativeLoadID from localstorage
   */
  resumeNativeAd(currentNativeLoadID: string) {
    NativeAd.resumeNativeAd({ adId: currentNativeLoadID }).then(() => { }).catch(() => { });
  }

  /**
   * Resume Native Ad
   * @param currentNativeLoadID currentNativeLoadID from localstorage
   */
  removeNativeAd(currentNativeLoadID: string) {
    NativeAd.removeNativeAd({ adId: currentNativeLoadID }).then(() => { }).catch(() => { });
  }
}
