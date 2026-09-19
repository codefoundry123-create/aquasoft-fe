import { Component, OnInit, OnDestroy } from '@angular/core';
import { App } from '@capacitor/app';
import { AdmobService } from '../services/admob.service';
import { SharedUtilService } from '../services/shared-util.service';
import { Router } from '@angular/router';
import { AppStorageService } from '../services/app-storage.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { LoggerService } from '../services/analytic.service';
import ForceClose from '../CustomPlugin/ForaceClsoe';

@Component({
  selector: 'app-exit.popup',
  templateUrl: './exit.popup.component.html',
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule],
  styleUrls: ['./exit.popup.component.scss']
})
export class ExitPopupComponent implements OnInit, OnDestroy {

  isPremiumPlan: boolean = false;
  adSkeleton: boolean = false;
  ExitScreen: boolean = false;
  counter = 3;
  showFeatureSkeleton = true;

  constructor(
    private admobService: AdmobService,
    private sharedUtilService: SharedUtilService,
    private appStorageService: AppStorageService,
    private router: Router,
    private loggerService: LoggerService
  ) {

  }

  async ngOnInit(): Promise<void> {
    this.loggerService.track('exit_screen_opened');
    this.sharedUtilService.setScreen('exitScreen');

    this.appStorageService.get<boolean>('isPremiumPlan', false).then((isPremiumPlan) => {
      this.isPremiumPlan = isPremiumPlan;
      if (!this.isPremiumPlan) {
        this.showExitAds();
      }
    }).catch(() => { });


    const interval = setInterval(() => {
      if (this.counter > 0) {
        this.counter--;
        this.loggerService.track('exit_screen_countdown', { value: this.counter });
      } else {
        clearInterval(interval);
      }
    }, 1000);

    if(!this.isPremiumPlan){
      setTimeout(() => {
        this.showFeatureSkeleton = false;
      }, 2000); // 2 seconds
    }else{
      this.showFeatureSkeleton = false
    }
  }

  showExitAds() {
      this.appStorageService.get<any>('AdsControler', '').then((AdsIdControl: any) => {
          if (
            AdsIdControl?.exit_Ads?.ads_exit_ad &&
            AdsIdControl?.exit_Ads?.ads_native_exit_id &&
            AdsIdControl?.exit_Ads?.ad_type === '1'
          ) {
            this.adSkeleton = true;
            this.loggerService.track('exit_native_ad_loading');

            this.admobService
              .loadNativeAd(AdsIdControl.exit_Ads.ads_native_exit_id, 7000)
              .then((res) => {
                if (this.sharedUtilService.getScreen() === 'exitScreen' && res != null) {
                  this.loggerService.track('exit_native_ad_loaded');
                  this.admobService.showNativeAd(res.adId, 'ExitAdId', 'exit_native_ad').catch(() => {
                      this.loggerService.track('exit_native_ad_show_error');
                    })
                    .finally(() => {});
                }
              })
              .catch(() => {
                this.loggerService.track('exit_native_ad_failed');
              });
          }

          if (
            AdsIdControl?.exit_Ads?.ads_exit_ad &&
            AdsIdControl?.exit_Ads?.ads_banner_exit_id &&
            AdsIdControl?.exit_Ads?.ad_type === '2'
          ) {
            this.loggerService.track('exit_banner_ad_loading');
            this.adSkeleton = true;

            const bannerDetails = {
              id: AdsIdControl.exit_Ads.ads_banner_exit_id,
              type: 'adaptive',
              margin: 300,
              collapsible: false
            };

            if (this.sharedUtilService.getScreen() === 'exitScreen') {
              this.admobService.startBannerAdRefresh(bannerDetails).then(() => {
                this.loggerService.track('exit_banner_ad_loaded');
              });
            }
          }
        }).catch(() => {});
  }

  exitApp(): void {
    this.loggerService.track('exit_app_clicked');
    this.removeAds();
    this.ExitScreen = true;

    setTimeout(() => {
      this.ExitScreen = false;
      this.loggerService.track('exit_app_finalizing');
      App.exitApp();
      ForceClose.closeApp();
    }, 2000);
  }

  close(): void {
    this.loggerService.track('exit_popup_closed');
    this.router.navigate(['/main']);
  }

  goToHistoryPage() {
    this.loggerService.track('exit_nav_history');
    this.router.navigate(['/history']);
  }

  goToReminderPage() {
    this.loggerService.track('exit_nav_reminder');
    this.router.navigate(['/reminder']);
  }

  removeAds() {
    if (!this.isPremiumPlan) {
      this.loggerService.track('exit_remove_ads');

      this.admobService.removeBannerAd().catch(() => {});

      this.appStorageService
        .get('currentNativeLoadID', '')
        .then((currentNativeLoadID) => {
          if (currentNativeLoadID) {
            this.admobService.removeNativeAd(currentNativeLoadID);
            this.appStorageService.remove('currentNativeLoadID');
            this.loggerService.track('exit_native_removed');
          }
        })
        .catch(() => {});
    }
  }

  ngOnDestroy(): void {
    this.loggerService.track('exit_screen_destroyed');
    this.removeAds();
  }
}