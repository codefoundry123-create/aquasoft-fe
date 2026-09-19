import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LocalNotificationService } from '../services/notification.service';
import { environment } from 'src/environments/environment';
import { LoggerService } from '../services/analytic.service';
import { App } from '@capacitor/app';
import { SqliteService } from '../services/sqlite.service';
import { IonModal } from '@ionic/angular';
import { SharedUtilService } from '../services/shared-util.service';
import { AppStorageService } from '../services/app-storage.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AdmobService } from '../services/admob.service';
import { CollapsibleBanner } from '../CustomPlugin/CollapsibleBanner';
import { openGmailApp } from '../CustomPlugin/OpenEmail';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, TranslateModule],
})
export class SettingsComponent implements OnInit {
  @ViewChild('deleteModal') deleteModal!: IonModal;
  showMenu: boolean = false;
  // mainUser: any;
  mainUser = signal<any | null>(null);

  userId: string = '';
  plateform: string = '';
  isOnline: boolean = true;
  isBannerAdActive: boolean = false;
  appVersion: string = '';

  isPremiumPlan: boolean = false;
  AdsIdControl: any;

  // isRatingModalOpen = false;
  isRatingModalOpen = signal<boolean>(false);

  rating = 0;
  stars = Array(5).fill(0);
  avatars: string[] = [
    'assets/avatars/avatar-1.svg',
    'assets/avatars/avatar-2.svg',
    'assets/avatars/avatar-3.svg',
    'assets/avatars/avatar-4.svg',
    'assets/avatars/avatar-5.svg',
    'assets/avatars/avatar-6.svg',
  ];

  selectedAvatar: number | null = null;
  profileIcon: string | null = null;

  //Ads variable
  nativeAdSkeleton = signal(false);
  collapsibleAdSkeleton = signal(false);

  constructor(
    private router: Router,
    private appStorageService: AppStorageService,
    private notificationService: LocalNotificationService,
    private loggerService: LoggerService,
    private sharedUtilService: SharedUtilService,
    private sqliteService: SqliteService,
    private admobService: AdmobService
  ) {
    this.sharedUtilService.getNetworkStatus().subscribe((isOnline: boolean) => {
      this.isOnline = isOnline;
    });
  }

  async ngOnInit(): Promise<void> {
    this.loggerService.setScreen('settings_screen', 'Screen');

    App.getInfo()
      .then((data) => {
        this.appVersion = data.version;
        this.loggerService.track('app_version_loaded');
      })
      .catch(() => { });

    this.appStorageService.get('userId', '').then((userId) => {
      this.userId = userId;
      this.loggerService.track('user_id_loaded');

      if (this.userId) {
        this.sqliteService.getUserById(this.userId).then((user) => {
          this.mainUser.set(user);
          this.loggerService.track('user_profile_loaded');
        });
      }
    }).catch(() => { });

    this.appStorageService.get('profileIcon', '').then((profileIcon) => {
      this.profileIcon = profileIcon;
      this.loggerService.track('profile_icon_loaded');
    });

    this.appStorageService.get('isPremiumPlan', false).then((premiumValue) => {
      this.isPremiumPlan = premiumValue;

      this.appStorageService.get('AdsControler', '').then((AdsIdControl) => {
        this.AdsIdControl = AdsIdControl;

        if(!this.isPremiumPlan){
          this.sharedUtilService.setScreen('Settings');
            // native ad load
            if (
              this.AdsIdControl?.Settings_Ads?.enable &&
              this.AdsIdControl?.Settings_Ads?.ad_type === '1' &&
              this.AdsIdControl?.Settings_Ads?.ads_native_settings_id &&
              this.isOnline
            ) {
              this.showNativeAd();
            } else if (
              this.AdsIdControl?.Settings_Ads?.enable &&
              this.AdsIdControl?.Settings_Ads?.ad_type === '2' &&
              this.AdsIdControl?.Settings_Ads?.ads_Collapsible_banner_settings_id &&
              this.isOnline
            ) {
              this.showCollapsibleBannerAd();
            } else { }
        }

      });
    });

  }

  
      /**
       * Show native ad
       */
      showNativeAd() {
        this.nativeAdSkeleton.set(true);
        this.admobService.loadNativeAd(this.AdsIdControl?.Settings_Ads?.ads_native_settings_id, 7000).then(async (res) => {
          this.nativeAdSkeleton.set(false);

          if (this.sharedUtilService.getScreen() === 'Settings' && res != null) {
            this.admobService.showNativeAd(res.adId, 'SettingsAdId', 'setting_medium_native').then((res) => {
            }).catch(() => { });
          }
        }).catch(() => { });
      }
    
    
      /**
      * show Collapsible Banner
      */
      showCollapsibleBannerAd() {
        this.isBannerAdActive = true;
        this.collapsibleAdSkeleton.set(true);
        if(this.sharedUtilService.getScreen() === 'Settings'){
          CollapsibleBanner.showCollapsibleBanner({
            adUnitId: this.AdsIdControl?.Settings_Ads?.ads_Collapsible_banner_settings_id,
            collapsiblePosition: 'bottom', // or 'top'
            marginBottom: 40
          }).then(() => {
          }).catch(() => { }).finally(() => {
            setTimeout(() => {
              this.collapsibleAdSkeleton.set(false);
            }, 2000);
          });
        }
      } 



  goToMain() {
    this.loggerService.track('navigate_main_clicked');
    this.router.navigate(['main']);
  }

  goToEdit(field: string) {
    this.loggerService.track(`edit_profile_field_clicked_${field}`);
    this.router.navigate(['/user-form'], { queryParams: { editField: field } });
  }

  privacyPolicy() {
    this.loggerService.track('open_privacy_policy');
    window.open(environment.privacyPolicy, '_blank');
  }

  shareApplication() {
    this.loggerService.track('share_app_clicked');
    this.sharedUtilService.shareContent();
  }

  selectAvatar(index: number) {
    this.loggerService.track(`avatar_selected_${index}`);
    this.selectedAvatar = index;
  }

  confirmAvatarSelection() {
    this.loggerService.track('avatar_confirm_clicked');

    if (this.selectedAvatar !== null) {
      const chosenAvatar = this.avatars[this.selectedAvatar];
      if (chosenAvatar) {
        this.loggerService.track(`avatar_applied_${this.selectedAvatar}`);
        this.appStorageService.set('profileIcon', chosenAvatar);
        this.profileIcon = chosenAvatar;
      }
    }
  }

  goToTutorial() {
    this.loggerService.track('tutorial_open_from_settings');
    this.router.navigate(['/tutorial'], { queryParams: { source: 'settings' } });
  }

  async deleteAccount() {
    this.loggerService.track('delete_account_confirmed');
    this.deleteModal.dismiss();

    if (this.userId) {
      this.sqliteService
        .deleteAccount(this.userId)
        .then((res) => {
          if (res) {
            this.loggerService.track('account_deleted_success');
            this.appStorageService.set('enableReminder', false);
            this.notificationService.customLocalNotifications();
            this.notificationService.defaultLocalNotifications();
            this.appStorageService.clear();
            this.appStorageService.set('AdsControler', this.AdsIdControl);
            this.appStorageService.set('isPremiumPlan', this.isPremiumPlan);
            this.sqliteService.initDB().catch((err) => { });
            this.router.navigate(['/user-form']);
          }
        })
        .catch(() => {
          this.loggerService.track('account_delete_failed');
        });
    }
  }

  goToLanguage() {
    this.loggerService.track('language_settings_clicked');
    this.router.navigate(['/language'], { queryParams: { source: 'settings' } });
  }

  goToSubscription() {
    this.loggerService.track('subscription_screen_opened');
    this.router.navigate(['/subscribe'], { queryParams: { isHomeCheck: false } });
  }

  openRatingModel() {
    this.loggerService.track('rating_modal_opened');
    this.rating = 0;
    this.isRatingModalOpen.set(true);
  }

  setRating(star: number) {
    this.loggerService.track(`rating_star_clicked_${star}`);
    this.rating = star;
  }

  async submitRating() {
    this.loggerService.track(`rating_submitted_${this.rating}`);
    this.isRatingModalOpen.set(false);


    if (this.rating > 3) {
      this.loggerService.track('redirect_to_playstore_for_review');
      window.open(
        'https://play.google.com/store/apps/details?id=com.waterreminderdailyfitness.app',
        '_blank'
      );
    } else {
      this.loggerService.track('redirect_to_email_feedback');
      const email = 'Info@burjsoft.com';
      const subject = 'Feedback on App Experience';
      const body = 'Hi BurjSoft Team,\n\nI’d like to share my feedback:\n\n';
      await openGmailApp(email, subject, body);
    }
  }

    /**
  * On destroy
  */
  ngOnDestroy() {
    if (!this.isPremiumPlan) {
      // Remove Collapsible Banner
      CollapsibleBanner.destroyCollapsibleBanner().catch(() => { });
      // Native ad remove
      this.appStorageService.get('currentNativeLoadID', '').then((currentNativeLoadID)=>{
        if (currentNativeLoadID && currentNativeLoadID != null) {
        this.admobService.removeNativeAd(currentNativeLoadID);
        this.appStorageService.remove('currentNativeLoadID');
      };
      }).catch(()=>{});
    }
  }
}
