import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, NgZone, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoggerService } from '../services/analytic.service';
import { AdmobService } from '../services/admob.service';
import { Swiper } from 'swiper/types';
import { SharedUtilService } from '../services/shared-util.service';
import { Subscription } from 'rxjs';
import { AppStorageService } from '../services/app-storage.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { NativeAd } from '../CustomPlugin/NativeAdPlugin';

@Component({
  selector: 'app-tutorial',
  templateUrl: './tutorial.component.html',
  styleUrls: ['./tutorial.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TutorialComponent implements OnInit, OnDestroy {

  @ViewChild('swiperRef') swiperRef: ElementRef | undefined;
  swiper?: Swiper;
  currentSlideIndex = signal(0);
  source: string = '';
  isPremiumPlan: boolean = false;
  isOnline: boolean = true;
  nativeAdSkeleton= signal(false);
  showSmallLoader = signal(false);
  small_native_adLoad_id: string = '';
  full_native_adLoad_id: string = '';
  showPagination: boolean = true;
  fullNativeAdShow: boolean = false;
  fullNativeRequestGoing: boolean = false;
  showcloaseBtn = signal(false);
  AdsIdControl: any;
  NativeAdSubscription$: Subscription = new Subscription();
  isIntersitialLoading = signal(false);

  // interstitial Ads
  interstitialAdSubscription$: Subscription = new Subscription();
  private nativeAdStatusSub?: Subscription;

  isAdDisplayed: boolean = false;

  constructor(private router: Router,
    private appStorageService: AppStorageService,
    private loggerService: LoggerService,
    private sharedUtilService: SharedUtilService,
    private admobService: AdmobService,
    private route: ActivatedRoute)
    { 
      this.sharedUtilService.getNetworkStatus().subscribe((isOnline) => {
      this.isOnline = isOnline;
    });
    }

  ngOnInit() {
    this.loggerService.setScreen("tutorial", 'tutorialScreen');
    this.loggerService.track('tutorial_screen');

    this.appStorageService.get<boolean>('isPremiumPlan', false).then((isPremiumPlan) => {
      this.isPremiumPlan = isPremiumPlan
      if (!this.isPremiumPlan) {

        this.appStorageService.get('AdsControler', '').then((AdsIdControl) => {
          this.AdsIdControl = AdsIdControl;

          if (
            this.AdsIdControl &&
            this.AdsIdControl?.tutorial_Ads?.ads_native_tutorial_ad &&
            this.AdsIdControl?.tutorial_Ads?.ads_native_tutorial_id &&
            this.isOnline
          ) {
            this.loggerService.track('tutorial_trigger_small_tutorial_ad');
            this.sharedUtilService.setScreen("tutorial");
            this.smalltutotialAd();
          }
        })
      }
    });

    this.route.queryParams.subscribe((params: any) => {
      this.source = params['source'];
      this.loggerService.track(`tutorial_source_${this.source}`);
    });
  }


  onActiveIndexChange(event: any) {
    this.currentSlideIndex.set(event?.detail[0]?.activeIndex ?? 0);
    const previousIndex = event?.detail[0]?.previousIndex;
    this.loggerService.track(`tutorial_active_slide_${this.currentSlideIndex()}_from_${previousIndex}`);

    if (this.isPremiumPlan) {
      return;
    }

    let fullAdTimeout: any;

    switch (this.currentSlideIndex()) {

      case 1:
        this.loggerService.track('tutorial_slide_1');

        if (this.small_native_adLoad_id && previousIndex !== 0) {
          this.loggerService.track('tutorial_resume_small_ad_slide1');
          this.admobService.resumeNativeAd(this.small_native_adLoad_id);
          this.appStorageService.set('currentNativeLoadID', this.small_native_adLoad_id);
          return;
        }

        if (fullAdTimeout) {
          clearTimeout(fullAdTimeout);
        }

        this.showSmallLoader.set(true);
        setTimeout(() => {
          this.showSmallLoader.set(false);
        }, 2000);

        break;

      case 2:
        this.loggerService.track('tutorial_slide_2');

        this.showPagination = false;

        if (this.small_native_adLoad_id) {
          this.admobService.hideNativeAd(this.small_native_adLoad_id);
        }

        fullAdTimeout = setTimeout(() => {
          this.showcloaseBtn.set(true);
        }, 5000);

        if (this.full_native_adLoad_id) {

          if (this.fullNativeAdShow) {
            this.loggerService.track('tutorial_resume_full_ad_slide2');
            this.admobService.resumeNativeAd(this.full_native_adLoad_id);
            this.appStorageService.set('currentNativeLoadID', this.full_native_adLoad_id);
          }
          else {
            setTimeout(() => {
              this.loggerService.track('tutorial_show_full_ad_slide2');
              this.admobService.showNativeAd(this.full_native_adLoad_id, 'fullTutorialAdId', 'intro_full')
                .then((showAd) => {
                  if (showAd) {
                    this.fullNativeAdShow = showAd;
                    this.NativeAdCloseBtnListener();
                    this.appStorageService.set('currentNativeLoadID', this.full_native_adLoad_id);
                  }
                }).catch(() => {
                  this.loggerService.track('tutorial_full_ad_show_error');
                });
            }, 100);
          }

        } else {
          this.loggerService.track('tutorial_load_full_ad_slide2');
          this.sharedUtilService.setScreen("slide2");
          this.fullNativeAd();
        }

        break;

      case 3:
        this.loggerService.track('tutorial_slide_3');

        this.showPagination = true;

        if (fullAdTimeout) {
          clearTimeout(fullAdTimeout);
        }

        if (this.small_native_adLoad_id) {
          this.loggerService.track('tutorial_resume_small_ad_slide3');
          NativeAd.resumeNativeAd({ adId: this.small_native_adLoad_id }).then(() => {
            this.appStorageService.set('currentNativeLoadID', this.small_native_adLoad_id);
          });
        }

        if (this.full_native_adLoad_id) {
          this.admobService.hideNativeAd(this.full_native_adLoad_id);
        }

        break;

      default:
        this.loggerService.track('tutorial_slide_default');
        break;
    }
  }

  nextSlide() {
    this.loggerService.track('tutorial_next_slide');
    if (this.swiperRef) {
      this.swiperRef.nativeElement.swiper.slideNext();
    }
  }

  prevSlide() {
    this.loggerService.track('tutorial_prev_slide');
    if (this.swiperRef) {
      this.swiperRef.nativeElement.swiper.slidePrev();
    }
  }

  smalltutotialAd() {
    this.loggerService.track('tutorial_small_ad_start');
    this.nativeAdSkeleton.set(true);

    this.admobService.loadNativeAd(this.AdsIdControl?.tutorial_Ads?.ads_native_tutorial_id, 10000).then((res) => {
      if (res == null) {
        this.loggerService.track('tutorial_small_ad_load_null');
        this.nativeAdSkeleton.set(false);
        return;
      }

      this.loggerService.track('tutorial_small_ad_loaded');
      if (this.sharedUtilService.getScreen() === 'tutorial') {
        this.admobService.showNativeAd(res.adId, 'TutorialAdId', 'intro_small').then(() => {
          this.loggerService.track('tutorial_small_ad_shown');
          this.nativeAdSkeleton.set(false);
          this.small_native_adLoad_id = res.adId;
          this.appStorageService.set('currentNativeLoadID', this.small_native_adLoad_id);
        }).catch(() => { });
      }
    }).catch(() => { });
  }

  fullNativeAd() {
    this.loggerService.track('tutorial_full_ad_request_start');

    if (
      this.AdsIdControl &&
      this.AdsIdControl?.tutorial_slide_ads?.ads_native_tutorial_slid_ad &&
      this.AdsIdControl?.tutorial_slide_ads?.ads_native_tutorial_slid_id &&
      !this.isPremiumPlan &&
      this.isOnline
    ) {

      if (this.fullNativeRequestGoing) {
        this.loggerService.track('tutorial_full_ad_request_blocked');
        return;
      }

      this.fullNativeRequestGoing = true;

      this.admobService.loadNativeAd(this.AdsIdControl?.tutorial_slide_ads?.ads_native_tutorial_slid_id, 7000)
        .then((res) => {
          if (res == null) {
            this.loggerService.track('tutorial_full_ad_load_null');
            this.nextSlide();
            this.fullNativeRequestGoing = false;
            return;
          }

          if (res?.adId) {
            this.full_native_adLoad_id = res.adId;
            this.loggerService.track('tutorial_full_ad_loaded');

            if (this.sharedUtilService.getScreen() === 'slide2') {

              this.admobService.showNativeAd(res.adId, 'fullTutorialAdId', 'intro_full')
                .then((showAd) => {
                  if (showAd) {
                    this.loggerService.track('tutorial_full_ad_shown');
                    this.fullNativeAdShow = showAd;
                    this.NativeAdCloseBtnListener();
                    this.appStorageService.set('currentNativeLoadID', this.full_native_adLoad_id);
                  }
                }).catch(() => {
                  this.loggerService.track('tutorial_full_ad_show_error');
                });
            }
          }

        }).catch(() => {
          this.loggerService.track('tutorial_full_ad_load_error');
        });
    }
  }

  closeSlide() {
    this.loggerService.track('tutorial_close_slide');
    this.nextSlide();
  }

  NativeAdCloseBtnListener() {
    this.loggerService.track('tutorial_register_ad_close_listener');

    if (this.nativeAdStatusSub) return; // prevent duplicate subscriptions
    this.nativeAdStatusSub = this.admobService.NativeAdStatus$?.subscribe((nativeAdStatus) => {
      if (nativeAdStatus?.NativeId?.action == 'close_clicked') {
        this.loggerService.track('tutorial_full_ad_close_clicked');
        if (this.full_native_adLoad_id) {
          this.admobService.hideNativeAd(this.full_native_adLoad_id);
          this.fullNativeAdShow = false;
        }
        this.nextSlide();
      }
    });
  }

  /**
 * pre-initialize Interstitial ad
 */
  showInterstitialAd() {
    this.isIntersitialLoading.set(true);
    this.isAdDisplayed = false;
    this.InterstitialAdListeners();
    this.admobService.preloadSplashInterstitialAd(this.AdsIdControl?.Delete_account?.ads_delete_account_inter_id, 'Tutorial_Component').then((loadAd) => {
      this.admobService.showSplashInterstitialAds('tutorial_screen').catch(() => {}).finally(()=>{
        this.isIntersitialLoading.set(false);
        this.isAdDisplayed = true;
      });
    }).catch(() => {
      this.isIntersitialLoading.set(false);
      this.finishTutorial();
    });
  }

  /**
 * Interstitial ad listener
 */
  InterstitialAdListeners() {
    this.interstitialAdSubscription$ = this.admobService.adMobInterstitialStatus$.subscribe((InterstitalStatus) => {
      this.loggerService.track(`Tutorial_Interstital_Ad_${InterstitalStatus}`);
      if (['Dismissed', 'FailedToShow', 'FailedToLoad'].includes(InterstitalStatus) && this.isAdDisplayed) {
        this.finishTutorial();
        // Unsubscribe to avoid repeated triggers
        this.interstitialAdSubscription$?.unsubscribe();
      }
    });
  }

  goToNextScreen() {
    if (!this.isPremiumPlan &&
      this.AdsIdControl &&
      this.AdsIdControl?.Delete_account?.ads_delete_account_inter_id &&
      this.AdsIdControl?.Delete_account?.ads_delete_account_ad &&
      this.isOnline
    ) {
      //hide Small Native or banner ad
      this.hideSmallNative();
      //show Interstitial Ad
      this.showInterstitialAd();
    } else {
      this.finishTutorial();
    }

  }

  finishTutorial() {
    this.loggerService.track('tutorial_finish_clicked');

    if (this.source === 'language') {
      this.loggerService.track('tutorial_finish_to_user_form');
      this.router.navigate(['/user-form']);

    } else if (this.source === 'settings') {
      this.loggerService.track('tutorial_finish_to_settings');
      this.router.navigate(['/settings']);

    } else {
      this.loggerService.track('tutorial_finish_no_source');
    }
  }

  hideSmallNative() {
    this.admobService.removeBannerAd().catch(() => { });
    if (this.small_native_adLoad_id) {
      this.admobService.removeNativeAd(this.small_native_adLoad_id);
    }
  }

  ngOnDestroy() {
    this.loggerService.track('tutorial_Destroy');

    this.admobService.removeBannerAd()
      .then(() => {
        this.loggerService.track('tutorial_banner_removed');
      })
      .catch(() => {
        this.loggerService.track('tutorial_banner_remove_error');
      });

    if (this.small_native_adLoad_id) {
      this.loggerService.track('tutorial_remove_small_ad');
      this.admobService.removeNativeAd(this.small_native_adLoad_id);
    }

    if (this.full_native_adLoad_id) {
      this.loggerService.track('tutorial_remove_full_ad');
      this.admobService.removeNativeAd(this.full_native_adLoad_id);
    }

    this.appStorageService.remove('currentNativeLoadID');

    this.interstitialAdSubscription$?.unsubscribe();
    this.nativeAdStatusSub?.unsubscribe();
  }

}
