import { ChangeDetectorRef, Component, OnInit } from '@angular/core'
import { Location } from '@angular/common';
import { Router } from '@angular/router'
import { REMINDER_TIME } from './constants'
import { LoggerService } from './services/analytic.service';
import { AdmobService } from './services/admob.service';
import { App } from '@capacitor/app';
import { TranslateService } from '@ngx-translate/core';
import { LoaderService } from './services/loader.service';
import { AppUpdate, AppUpdateAvailability } from '@capawesome/capacitor-app-update';
import { SqliteService } from './services/sqlite.service';
import { LocalNotificationService } from './services/notification.service';
import { SplashScreen } from '@capacitor/splash-screen';
import { Platform } from '@ionic/angular';
import { SharedUtilService } from './services/shared-util.service';
import { AppStorageService } from './services/app-storage.service';
import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { StatusBar, Style } from '@capacitor/status-bar';
import { FCMService } from './services/fcm.service';
import HideNavigationBar from './CustomPlugin/HideNavigationBar';
import { AppOpenAd } from './CustomPlugin/AppOpenAd';
import { SubscriptionManager } from './CustomPlugin/inAppPurchase';
import { RemoteService } from './services/remote.service';
addIcons(allIcons);

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, TranslateModule, FormsModule]
})

export class AppComponent implements OnInit {

  defaultTime: any = REMINDER_TIME;
  isShowInternetModal: boolean = false;
  isPremiumPlan: boolean = false;

  isAppMinimised = false;
  loaderState: any;
  isAppOpenAdLoading: boolean = false;

  appStateChange = {
    isActive: false
  };

  isOnline: boolean = true;

  AppOpenAdCheck: boolean = false;
  isAdShowing: boolean = false;
  resumeAdId: string = '';
  ExitScreen: boolean = false;

  isAppOpenAddShowing: boolean = false;
  selectedLanguage = { name: 'English-English', code: 'en' };

  constructor(
    private platform: Platform,
    private router: Router,
    private appStorageService: AppStorageService,
    private fcm: FCMService,
    private admobService: AdmobService,
    private cdr: ChangeDetectorRef,
    private loggerService: LoggerService,
    private sharedUtilService: SharedUtilService,
    private translate: TranslateService,
    private loaderService: LoaderService,
    private sqliteService: SqliteService,
    private notification: LocalNotificationService,
    private location: Location,
    private remoteService: RemoteService
  ) {
    // this.checkNewVersion();
    this.translate.setDefaultLang('en');
  }

  async ngOnInit() {
    this.platform.ready().then(async (res: any) => {
      if (res) {
        SplashScreen.hide().catch(()=>{});
    
        try {
          // This runs in the background without blocking UI
          await this.sqliteService.initDB();
        }catch (err) {}

        this.checkNetworkConnection(); // check internet connection

        this.loaderService.getLoaderState().subscribe((data) => {
          this.loaderState = data;
          this.cdr.detectChanges();
        });

        if (this.isOnline) {
          await this.remoteService.init();
          await this.subscriptionActivePurchases();
          this.fcm.initializePushNotifications();

          await this.appStorageService.get<boolean>('isPremiumPlan', false).then((isPremiumPlan) => {
            this.isPremiumPlan = isPremiumPlan
            if (!this.isPremiumPlan) {
              HideNavigationBar.hide().then(() => { }).catch(() => { });

              StatusBar.setStyle({ style: Style.Light }).catch((error) => {});
              StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => { });
            }
          }
          ).catch(() => { });
          this.admobService.initAdMob();
          this.checkNewVersion();
        }

        App.addListener('backButton', ({ canGoBack }) => {
          const url = this.router.url;
          if (url === '/exit') return;

          url=== '/main' ? this.router.navigate(['/exit']) : this.location.back();
        });

        this.initialize();
      }

    }).catch(() => { });

    this.loggerService.track('App Initialized');
    this.loggerService.setScreen("AppComponent", "AppScreen")
  }

  ngAfterViewInit() {
    this.platform.ready().then((res) => {
      if (res) {
        // Modify your ad event listeners
        this.admobService.AppOpenAdStatus$.subscribe((AppOpenAdStatus) => {

          if (AppOpenAdStatus === null || AppOpenAdStatus === undefined) return;

          this.loggerService.track(`appComponent_App_Open_Ad_${AppOpenAdStatus}`);

          if (AppOpenAdStatus === 'adOpened') {
            this.isAppOpenAddShowing = true;
          }

          if (AppOpenAdStatus === 'adDismissed' || AppOpenAdStatus === 'adFailedToLoad' || AppOpenAdStatus === 'adFailedToShow' || AppOpenAdStatus === 'adAlreadyOpened' || AppOpenAdStatus === 'adLoadCancelled') {
            this.isAppMinimised = false;
            this.isAppOpenAddShowing = false;
            this.AppOpenAdCheck = false;

            this.appStorageService.get<string>("currentNativeLoadID", '').then(async (currentNativeLoadID) => {
              if (currentNativeLoadID && currentNativeLoadID != null) {
                this.admobService.resumeNativeAd(currentNativeLoadID);
              }
            }).catch(() => { });

            this.admobService.resumeBannerAd();
            this.loaderService.hide();
          }

          // if (AppOpenAdStatus === 'adDismissed' && this.router.url == '/welcome') {
          //   this.router.navigate(['/language'], {
          //     queryParams: { source: 'welcome' },
          //   });
          // }

          this.cdr.detectChanges();
        });

        // Updated appStateChange listener
        App.addListener('appStateChange', (state) => {
          this.appStateChange = state;

          if (state?.isActive) {

            if (this.router.url === '/welcome') {
              this.isAppMinimised = false;
              this.AppOpenAdCheck = false;
              return;
            }

            // App came to foreground
            if (this.isAppMinimised) {
              // Only trigger ad check if the app was minimized by the user (not due to an ad)

              this.appStorageService.get<any>("AdsControler", "").then((AdsIdControl: any) => {
                if (AdsIdControl?.app_open_resume && AdsIdControl?.app_open_resume?.app_open_resume_id && AdsIdControl?.app_open_resume?.app_open_resume_ad && this.isOnline && !this.isPremiumPlan) {
                  this.isAppOpenAdLoading = true;
                  AppOpenAd.loadAd({ adUnitId: AdsIdControl?.app_open_resume?.app_open_resume_id }).then(() => {
                    this.isAppOpenAdLoading = false;
                    AppOpenAd.showAd().then(() => { }).catch(() => { });
                  }).catch(() => { this.isAppOpenAdLoading = false; });

                  this.AppOpenAdCheck = state.isActive;
                  this.cdr.detectChanges();

                  setTimeout(() => { // if AppOpenAd not display and fail
                    if (!this.isAppOpenAddShowing && this.isAppOpenAdLoading) {
                      AppOpenAd.cancelAdRequest().then(() => { }).catch((error) => { });
                      this.AppOpenAdCheck = false;
                      this.cdr.detectChanges();
                    }
                  }, 8000);


                  if (this.AppOpenAdCheck) {
                    this.appStorageService.get<string>("currentNativeLoadID", '').then((currentNativeLoadID) => {
                      if (currentNativeLoadID != null && currentNativeLoadID) {
                        this.admobService.hideNativeAd(currentNativeLoadID);
                      }
                    }).catch(() => { });
                    this.admobService.hideBannerAd();
                  }
                }
              }).catch(() => { });
              this.isAppMinimised = false;
            }
          } else {
            // App went to background
            if (!this.admobService.isIntertialAdShowing) {
              // Only mark as minimized if no ad is showing
              this.isAppMinimised = true;
            }
          }
        });
      }
    }).catch(() => { });
  }


  /**
   * initialize
   */
  initialize() {
    // Enable reminder
    this.appStorageService.get<string>('enableReminder', 'true').then((isNotificationEnabled) => {
      return this.appStorageService.set('enableReminder', isNotificationEnabled);
    }).catch(() => {
      this.appStorageService.set('enableReminder', 'true');
    });

    // Default reminder
    this.appStorageService.get<any>('defaultReminder').then((notifications) => {
      if (!notifications) {
        this.appStorageService.set('defaultReminder', this.defaultTime);
      }
    })
      .catch(() => {
        this.appStorageService.set('defaultReminder', this.defaultTime);
      });

    // Trigger notifications
    this.notification.defaultLocalNotifications();

    // Selected language
    this.appStorageService.get<any>("selectedLanguage", "").then((selectedLanguage) => {
      const language = selectedLanguage ?? this.selectedLanguage;
      if (language) {
        this.translate.use(language.code);
      }
    }).catch(() => {
      this.translate.use('en');
    });
  }


  /**
   * version update funcation
   */
  checkNewVersion() {

    AppUpdate.getAppUpdateInfo().then(async (AppDetail) => {
      // Check previous Version < Latest Version
      if (AppDetail.updateAvailability !== AppUpdateAvailability.UPDATE_AVAILABLE) {
        return;
      }

      if (AppDetail.immediateUpdateAllowed) {
        await AppUpdate.performImmediateUpdate().then((res) => { });
      }
    }).catch((error) => { });
  }

  /**
   * check internet connect
   */
  checkNetworkConnection() {
    this.sharedUtilService.getNetworkStatus().subscribe((isOnline: boolean) => {
      this.isOnline = isOnline;
      this.isShowInternetModal = !isOnline;
      this.cdr.detectChanges();
      this.admobService.isAdEnabled = !this.isPremiumPlan && isOnline ? true : false;
    });

    this.sharedUtilService.checkNetworkStatus();
  }

  /**
   * Reload Func
   */
  retryConnection() {
    window.location.reload();
  }

  /**
   * subscription Listener
   */
  async subscriptionActivePurchases() {
    await SubscriptionManager.getActivePurchases().then((getActivePurchases: any) => {
      const isAnyAutoRenewing = getActivePurchases?.subscriptions?.some((sub: any) => sub?.autoRenewing === true);
      if (isAnyAutoRenewing) {
        this.appStorageService.set('isPremiumPlan', true);
      } else {
        this.appStorageService.set('isPremiumPlan', false);
      }
    }).catch(() => { });
  }

  ngOnDestroy() {
    this.sqliteService.closeDB().then(() => { }).catch(err => { });
  }
}
