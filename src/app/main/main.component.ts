import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal, } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AdmobService } from '../services/admob.service';
import { LoggerService } from '../services/analytic.service';
import { SharedUtilService } from '../services/shared-util.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Router } from '@angular/router';
import { SqliteService } from '../services/sqlite.service';
import { LoaderService } from '../services/loader.service';
import { driver } from 'driver.js';
import { AppStorageService } from '../services/app-storage.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    FormsModule,
  ],
})
export class MainComponent implements OnInit, OnDestroy {
  waterVolume: number[] = [];
  todayGoal: number = 0;
  waterUnit: string = 'ml';
  goalReached: number = 0;
  mainUser: any;
  userId: string = '';
  goalAchieved: number = 0;

  isOnline: boolean = true;

  todayRecords: { id: number, volume: number, time: string, src: string }[] = [];
  isOpen = false;
  selectedItem = { value: 125, label: '125 ml', src: 'assets/images/glass.svg' };
  selectedGlass = { value: 125, label: '125 ml', src: 'assets/images/glass.svg' };
  customQty: number = 200;
  isCutomeVlaueSet: boolean = false;

  qtyOptions = [
    { value: 100, label: '100 ml', src: 'assets/images/cup.svg' },
    { value: 125, label: '125 ml', src: 'assets/images/glass.svg' },
    { value: 200, label: '200 ml', src: 'assets/images/bottle.svg' },
    { value: 500, label: '500 ml', src: 'assets/images/jug.svg' }
  ];

  nextNotificationTime: string = '';
  newUserID: string = '';
  isPremiumPlan: boolean = false;
  nativeAdSkeleton =signal(false) ;
  AdsIdControl: any;

  isGoalModalOpen = false;
  goalAlreadyShown = false;

  isLoader: boolean = false;
  loadingTarget: string | null = null;
  isInterstitialAdDisplayed: boolean = false;
  interstitialAdSubscription$: Subscription = new Subscription();
  
  constructor(
    private appStorageService: AppStorageService,
    private cdr: ChangeDetectorRef,
    private admobService: AdmobService,
    private loggerService: LoggerService,
    private translate: TranslateService,
    private router: Router,
    private sharedUtilService: SharedUtilService,
    private loaderService: LoaderService,
    private sqliteService: SqliteService) {
    this.sharedUtilService.getNetworkStatus().subscribe((isOnline: boolean) => {
      this.isOnline = isOnline;
    });
  }

  async ngOnInit(): Promise<void> {
    this.loggerService.setScreen("Home", 'HomeScreen');
    this.sharedUtilService.setScreen('Home');
    this.initialize();
    this.initNotificationActionListener();

    this.initTourIfNeeded();
    this.appStorageService.get<boolean>('isPremiumPlan', false).then((isPremiumPlan) => {
      this.isPremiumPlan = isPremiumPlan;
      if (!isPremiumPlan) {
        this.appStorageService.get('AdsControler', '').then((AdsIdControl) => {
          this.AdsIdControl = AdsIdControl;
          // native ad load
          if (
            this.AdsIdControl?.Tab_Ads?.ads_tab_ad &&
            this.AdsIdControl?.Tab_Ads?.ads_native_tab_id &&
            this.AdsIdControl?.Tab_Ads?.ad_type == "1" &&
            this.isOnline
          ) {
            this.preNativeAdLoad(this.AdsIdControl);
          }

          // Banner ads
          if (
            this.AdsIdControl?.Tab_Ads?.ads_tab_ad &&
            this.AdsIdControl?.Tab_Ads?.ads_banner_tab_id &&
            this.AdsIdControl?.Tab_Ads?.ad_type == "2"
          ) {
            this.preBannerAds(this.AdsIdControl);
          }
        }).catch(() => { });
      }
    }
    ).catch(() => { });
  }

  // Initialize the user tour if it hasn't been shown before
  initTourIfNeeded() {
    // Only show if user is online and hasn't seen it before
    this.appStorageService.get('hydration_tour_done', false).then((tourShown) => {
      if (!tourShown && this.isOnline) {
        setTimeout(() => {
          this.startTour();
        }, 800);
      }
    }).catch(() => { });
  }

  // Start the guided tour
  startTour() {
    const tour = driver({
      showProgress: true,
      allowClose: false,
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Got it!',
      animate: true,
      steps: [
        {
          element: '#addWaterBtn',
          disableActiveInteraction: true,
          popover: { title: 'Add Water', description: 'Tap here to log your water intake.', side: 'bottom' }
        },
        {
          element: '#switchCupBtn',
          disableActiveInteraction: true,
          popover: { title: 'Change Cup', description: 'Change your default cup size from here.', side: 'bottom' }
        },
        {
          element: '#reminderBtn',
          disableActiveInteraction: true,
          popover: { title: 'Reminder', description: 'Set a reminder to stay hydrated throughout the day.', side: 'bottom' }
        },
        {
          element: '#statsBtn',
          disableActiveInteraction: true,
          popover: { title: 'Statistics', description: 'View your daily hydration progress here.', side: 'bottom' }
        },
      ],

      onDestroyed: () => {
        this.appStorageService.set('hydration_tour_done', 'true');
      }
    });
    tour.drive();
  }

  /**
   * 
   * @param AdsIdControl 
   */
  preNativeAdLoad(AdsIdControl: any) {
    this.nativeAdSkeleton.set(true);
    this.admobService.loadNativeAd(AdsIdControl?.Tab_Ads?.ads_native_tab_id, 7000).then(async (res) => {
      this.nativeAdSkeleton.set(false);
      if (this.sharedUtilService.getScreen() === 'Home' && res !=null) {
        this.admobService.showNativeAd(res.adId, 'HomeAdId', 'home_medium_native').catch(() => { });
      }
    }).catch(() => { });
  }

  preBannerAds(AdsIdControl: any) {
    this.nativeAdSkeleton.set(true);
    this.admobService.bannerAdSkeleton$.next(true);
    setTimeout(() => {
      this.admobService.bannerAdSkeleton$.next(false);
    }, 3000);

    const bannerDetails = {
      id: AdsIdControl?.Tab_Ads?.ads_banner_tab_id,
      type: "adaptive",
      margin: 50,
      collapsible: false
    };

    if (this.sharedUtilService.getScreen() === 'Home') {
      this.nativeAdSkeleton.set(false);
      this.admobService.startBannerAdRefresh(bannerDetails).catch(() => {});
    }
  }

  async initialize() {
   await this.appStorageService.get('userId', '').then((userId)=>{
      this.newUserID = userId;
    }).catch(()=>{});
    if (this.newUserID) {
      const user = await this.sqliteService.getUserById(this.newUserID);

      this.mainUser = user;
      if (user) {
        this.todayGoal = user.dailyGoal || 0;
        this.waterUnit = user.waterUnit || 'ml';
      }
    }
    this.fetchTodayWaterHistory();
    this.restoreGoalAchievedModalState();
  }

  initNotificationActionListener() {
    // Remove already initialized listener to avoid multiple alerts
    LocalNotifications?.removeAllListeners();

    // Capacitor notification action listener
    LocalNotifications.addListener('localNotificationActionPerformed', (notification: any) => {
      // const waterTake = Number(notification.actionId)
      // this.addUserWater(waterTake);
      let waterInML = this.waterUnit === 'fl oz' ? this.convertToMl(Number(notification.actionId)) : Number(notification.actionId);
      this.addUserWater(waterInML);
    });
  }

  async fetchTodayWaterHistory() {
    if (!this.newUserID) {
      return;
    }

    try {
      const allLogs = await this.sqliteService.getWaterDataByUser(this.newUserID);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const todayLogs = allLogs.filter(log => log.time.startsWith(today));

      let totalDrunkML = 0;
      const records: any[] = [];

      todayLogs.forEach(log => {
        totalDrunkML += log.drunk;

        let matchSrc = '';
        const match = this.qtyOptions.find(opt => opt.value === log.drunk);
        matchSrc = match ? match.src : 'assets/images/glass-150.svg';
        if (!match) {
          // Find matching qtyOption (if any)
          if (log.drunk === 300) {
            matchSrc = 'assets/images/glass-300.svg'
          } else if (log.drunk === 400) {
            matchSrc = 'assets/images/glass-400.svg'
          } else {
            matchSrc = 'assets/images/glass-150.svg';
          }
        }

        // Convert volume based on selected water unit
        const volumeValue = this.waterUnit === 'fl oz' ? this.convertToFlOz(log.drunk) : log.drunk;
        const volume = `${volumeValue} ${this.waterUnit}`;

        const logTime = new Date(log.time);
        const hour = logTime.getHours();
        const minutes = logTime.getMinutes().toString().padStart(2, '0'); 
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = (hour % 12) || 12;

        records.unshift({
          waterId: log.id,
          volume: volume,
          time: `${displayHour}:${minutes} ${ampm}`,
          src: matchSrc
        });
      });

      // Update UI / state
      this.todayRecords = records;

      if (this.waterUnit === 'fl oz') {
        this.goalAchieved = this.convertToFlOz(totalDrunkML);
      } else {
        this.goalAchieved = totalDrunkML;
      }

      this.setAnimations(totalDrunkML);
      this.cdr.detectChanges();

    } catch (err) {
      this.sharedUtilService.showToaster(`${this.translate.instant('MAIN.FAILED_TO_LOAD_HYDRATION_HISTORY')}`, 'top')
    }
  }

  setAnimations(waterVolumeML: number) {
    let percentage = 0;


    if (this.mainUser?.waterUnit === "fl oz") {
      const TotalWaterDrunkFLOZ = this.convertToFlOz(waterVolumeML);
      percentage = (TotalWaterDrunkFLOZ / this.todayGoal) * 100;
    } else {
      percentage = (waterVolumeML / this.todayGoal) * 100;
    }

    // Cap at 100%
    if (percentage > 100) {
      percentage = 100;
    }
      document.documentElement.style.setProperty('--percent', `${percentage}`);
  }

  restoreGoalAchievedModalState() {
    this.appStorageService.get("goal_modal_shown_date").then((storedDate)=>{
      const today = this.getTodayKey();
      this.goalAlreadyShown = storedDate === today;
    }).catch(()=>{});
  }

  getTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  /**
  * Subscription Screen Open
  */
  goToSubscription() {
    this.router.navigate(['/subscribe'], {
      queryParams: { isHomeCheck: true }
    });
  }


  NavigateWithAd(target: string) {
  if (this.isLoader) return;

  if (this.isPremiumPlan) {
    this.navigateTo(target);
  } else {
    this.loadingTarget = target;
    this.isLoader = true;

    setTimeout(() => {
      this.isLoader = false;
      this.loadingTarget = null;
      this.cdr.detectChanges(); // update UI
      this.removeAds();
      this.navigation(target);
    }, 2000);
  }
}

// Helper for template
isButtonLoading(target: string): boolean {
  return this.isLoader && this.loadingTarget === target;
}

  async navigation(name: string) {
    const interId = this.AdsIdControl?.Drawer_feature?.ads_drawer_feature_inter_id;
    const allowDrawerAd = this.AdsIdControl?.Drawer_feature?.ads_drawer_feature_ad;
    const waitTime = this.AdsIdControl?.Interval ?? 10000;  // default 10s

    const now = Date.now();
    this.appStorageService.get('lastDrawerAdTime', 0).then(async (lastAdTime) => {
      const canShowAd = (!lastAdTime) || ((now - lastAdTime) >= waitTime);

      // ✅ Try Show Ad before navigation
      if (interId && allowDrawerAd && canShowAd) {

        this.loaderService.show(true);

        this.InterstitialAdListeners(name);
        this.admobService.preloadSplashInterstitialAd(interId, 'drawer_component')
          .then((loaded) => {

            if (loaded) {
              this.admobService.showSplashInterstitialAds('drawer_component').finally(() => {
                this.isInterstitialAdDisplayed = true;
                // this.appStorageService.set("lastDrawerAdTime", now)

                // this.loaderService.hide();
                // this.navigateTo(name);    //  After ad, navigate
              });
            } else {
              this.loaderService.hide();
              this.navigateTo(name);
            }
          })
          .catch(() => {
            this.loaderService.hide();
            this.navigateTo(name);
          });

      }
      else {
        //  If no ad / blocked by time → Normal navigation
        this.navigateTo(name);
      }
    }).catch(() => { });
  }

  /**
 * Interstitial ad listener
 */
  InterstitialAdListeners(name: string) {
    this.interstitialAdSubscription$ = this.admobService.adMobInterstitialStatus$.subscribe((InterstitalStatus) => {
      this.loggerService.track(`Tutorial_Interstital_Ad_${InterstitalStatus}`);
      if (['Dismissed', 'FailedToShow'].includes(InterstitalStatus) && this.isInterstitialAdDisplayed) {
        this.loaderService.hide();
        this.navigateTo(name);
        // Unsubscribe to avoid repeated triggers
        this.interstitialAdSubscription$?.unsubscribe();
      }
    });
  }

  navigateTo(name: string) {
    if (name === 'settings') {
      this.loggerService.track('setting_clicked');
      this.router.navigate(['/settings']);
    }

    if (name === 'history') {
      this.loggerService.track('history_clicked');
      this.router.navigate(['/history']);
    }

    if (name === 'reminder') {
      this.loggerService.track('reminder_clicked');
      this.router.navigate(['/reminder']);
    }
  }

  convertToFlOz(valueInMl: number): number {
    return Number((valueInMl / 29.5735).toFixed(1));
  }

  convertToMl(valueInFlOz: number): number {
    return Number((valueInFlOz * 29.5735).toFixed(0));
  }


  getDisplayLabel(valueInMl: number): string {
    if (this.waterUnit === 'ml') {
      return `${valueInMl} ml`;
    } else {
      const flOzValue = this.convertToFlOz(valueInMl);
      return `${flOzValue} fl oz`;
    }
  }

  openSwitchCupModal() {
    this.isOpen = true;
    this.cdr.detectChanges();
  }

  closeSwitchCupModal() {
    this.isOpen = false;
    this.cdr.detectChanges();
  }

  onSliderChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.customQty = +input.value;
    this.isCutomeVlaueSet = true;
    this.cdr.detectChanges();
  }


  setQty(item: any) {
    this.selectedItem = item;
    this.isCutomeVlaueSet = false;
  }

  addDrink() {
    if (this.isCutomeVlaueSet) {
      this.addUserWater(this.customQty);
    } else {
      this.selectedGlass = this.selectedItem;
    }
    this.closeSwitchCupModal();
  }


  addUserWater(waterVolumeConsumedInML: number) {
    if (!this.newUserID) {
      return;
    }
    let updatedTotal = 0;
    // Calculate total after adding new intake
    if (this.waterUnit === 'fl oz') {
      updatedTotal = (this.goalAchieved || 0) + this.convertToFlOz(waterVolumeConsumedInML);
    } else {
      updatedTotal = (this.goalAchieved || 0) + waterVolumeConsumedInML;
    }

    // Goal achieved 
    if (updatedTotal === this.todayGoal && !this.goalAlreadyShown) {
      this.goalAlreadyShown = true;
      this.appStorageService.set("goal_modal_shown_date", this.getTodayKey());

      setTimeout(() => {
        this.openGoalModal();
      }, 300);
    }

    // Check if exceeds daily goal
    if (updatedTotal > this.todayGoal) {
      const remaining = Number(this.todayGoal - (this.goalAchieved || 0));
      if (remaining > 0) {
        const message = `${this.translate.instant('MAIN.YOU_CAN_ONLY_DRINK_MORE')} ${remaining.toFixed(1)}  ${this.waterUnit} ${this.translate.instant('MAIN.TO_REACH_YOUR_GOAL')} `;
        this.sharedUtilService.showToaster(message, 'top');
      } else {
        const message = this.translate.instant('MAIN.GOAL_REACHED_MESSAGE');
        this.sharedUtilService.showToaster(message, 'top');
      }

      return;
    }

    const entry = {
      userId: this.newUserID,
      drunk: waterVolumeConsumedInML,
      todayGoal: this.todayGoal || 1000,
      waterUnit: this.waterUnit || 'ml',
      time: new Date().toISOString(),
    };

    this.sqliteService.addWaterLog(entry)
      .then((success) => {
        if (success) {
          const message = this.translate.instant('MAIN.WATER_ADDED_SUCCESS');
          this.sharedUtilService.showToaster(message, 'top');
          this.fetchTodayWaterHistory();
        }
      }).catch(() => {
        const message = this.translate.instant('MAIN.ERROR_ADDING_WATER');
        this.sharedUtilService.showToaster(message, 'top');
      });
  }

  openGoalModal() {
    this.isGoalModalOpen = true;
  }

  closeGoalModal() {
    this.isGoalModalOpen = false;
  }

  async shareAchievement() {
    this.closeGoalModal();
      await this.sharedUtilService.shareContent({
        title: 'Hydration Goal Achieved ',
        text: `I just reached my daily water goal of ${this.todayGoal} ${this.waterUnit}!`,
      }).catch(()=>{});
  } 


  deleteHydrationHistory(waterID: number) {
    this.sqliteService.deleteWaterData(waterID).then((res) => {
        const message = this.translate.instant('MAIN.WATER_REMOVE_SUCCESS');
        this.sharedUtilService.showToaster(message, 'top');
      if (res) {
        //remove goal modal data so that it can be show again when goal achieved
        this.goalAlreadyShown = false;
        this.appStorageService.remove("goal_modal_shown_date");
        // fetch today water logs 
        this.fetchTodayWaterHistory();
      }
    }).catch((error) => {  });
  }

  removeAds(){
    if (!this.isPremiumPlan) {
      this.admobService.removeBannerAd().catch(()=>{});
      // Native ad remove
      this.appStorageService.get('currentNativeLoadID', '').then((currentNativeLoadID)=>{
        if (currentNativeLoadID && currentNativeLoadID != null) {
        this.admobService.removeNativeAd(currentNativeLoadID);
        this.appStorageService.remove('currentNativeLoadID');
      };
      }).catch(()=>{});

      this.interstitialAdSubscription$?.unsubscribe();
    }
  }

  /**
   * On destroy
   */
  ngOnDestroy() {
    if (!this.isPremiumPlan) {
      this.admobService.removeBannerAd().catch(()=>{});
      // Native ad remove
      this.appStorageService.get('currentNativeLoadID', '').then((currentNativeLoadID)=>{
        if (currentNativeLoadID && currentNativeLoadID != null) {
        this.admobService.removeNativeAd(currentNativeLoadID);
        this.appStorageService.remove('currentNativeLoadID');
      };
      }).catch(()=>{});

      this.interstitialAdSubscription$?.unsubscribe();
    }
  }

}
