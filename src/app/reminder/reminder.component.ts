// Updated ReminderComponent with added loggerService.track calls throughout all key user actions.

import { ChangeDetectorRef, Component, OnInit, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { REMINDER_TIME } from 'src/app/constants';
import { LocalNotificationService } from 'src/app/services/notification.service';
import { LoggerService } from '../services/analytic.service';
import { SqliteService } from '../services/sqlite.service';
import { AppStorageService } from '../services/app-storage.service';
import { CommonModule } from '@angular/common';
import { IonAccordionGroup, IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { AdmobService } from '../services/admob.service';
import { SharedUtilService } from '../services/shared-util.service';
import { CollapsibleBanner } from '../CustomPlugin/CollapsibleBanner';

@Component({
  selector: 'app-reminder',
  templateUrl: './reminder.component.html',
  styleUrls: ['./reminder.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule],
})
export class ReminderComponent implements OnInit {
  @ViewChild('accordionGroup', { static: false }) accordionGroup!: IonAccordionGroup;

  defaultTime: any = REMINDER_TIME;
  disableReminders: boolean = true;
  storedCustomTime = signal<any[]>([]);
  modelTime: any;
  memberNotification: boolean = true;
  user: any;
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  hour = 8;
  minute = 12;
  period: 'AM' | 'PM' = 'AM';
  selectedDays: string[] = [];
  isBannerAdActive: boolean = false;

  //Ads variable
  nativeAdSkeleton: boolean = false;
  collapsibleAdSkeleton: boolean = false;
  AdsIdControl: any;
  isPremiumPlan: boolean = false;
  isOnline: boolean = false;

  constructor(
    private router: Router,
    private appStorageService: AppStorageService,
    private notificationService: LocalNotificationService,
    private loggerService: LoggerService,
    private cdr: ChangeDetectorRef,
    private sqliteService: SqliteService,
    private admobService: AdmobService,
    private shareService: SharedUtilService
  ) {
    this.shareService.getNetworkStatus().subscribe((isOnline: boolean) => {
      this.isOnline = isOnline;
    });
  }

  ngOnInit(): void {
    this.loggerService.setScreen('reminder_screen', 'ReminderScreen');

    this.appStorageService.get('enableReminder', 'true').then((enableReminder) => {
      this.disableReminders = enableReminder === 'true';
      this.loggerService.track(`reminders_toggle_loaded_${this.disableReminders}`);
    })
      .catch(() => { });

    this.appStorageService.get('defaultReminder', '').then((defaultReminder) => {
      if (defaultReminder) {
        this.defaultTime = defaultReminder;
        this.loggerService.track('default_reminders_loaded');
      }
    }).catch(() => { });

    this.appStorageService.get('customTime', []).then((customTime) => {
      if (customTime) {
        this.storedCustomTime.set(customTime);
        this.loggerService.track('custom_reminders_loaded');
      }
    }).catch(() => { });

    this.appStorageService.get<boolean>('isPremiumPlan', false).then((isPremiumPlan) => {
      this.isPremiumPlan = isPremiumPlan

      if(!this.isPremiumPlan){

        this.appStorageService.get('AdsControler', '').then((AdsIdControl) => {
          this.AdsIdControl = AdsIdControl;
          this.shareService.setScreen('reminder');
          // native ad load
          if (
            this.AdsIdControl?.Reminder_Ads?.enable &&
            this.AdsIdControl?.Reminder_Ads?.ad_type === '1' &&
            this.AdsIdControl?.Reminder_Ads?.ads_native_reminder_id &&
            this.isOnline
          ) {
            this.showNativeAd();
          } else if (
            this.AdsIdControl?.Reminder_Ads?.enable &&
            this.AdsIdControl?.Reminder_Ads?.ad_type === '2' &&
            this.AdsIdControl?.Reminder_Ads?.ads_Collapsible_banner_reminder_id &&
            this.isOnline
          ) {
            this.showCollapsibleBannerAd();
          } else { 
          }

        }).catch(() => { });
      }
    }

    ).catch(() => { });
  }

    /**
     * Show native ad
     */
    showNativeAd() {
      this.nativeAdSkeleton = true;
      this.admobService.loadNativeAd(this.AdsIdControl?.Reminder_Ads?.ads_native_reminder_id, 7000).then(async (res) => {
        // this.nativeAdSkeleton = false;
        if (this.shareService.getScreen() === 'reminder' && res != null) {
          this.admobService.showNativeAd(res.adId, 'ReminderAdId', 'reminder_medium_native').then((res) => {
          }).catch(() => { })
        }
      }).catch(() => { });
    }
  
  
    /**
    * show Collapsible Banner
    */
    showCollapsibleBannerAd() {
      this.isBannerAdActive = true;
      this.collapsibleAdSkeleton = true;
      this.cdr.detectChanges();
      if(this.shareService.getScreen() === 'reminder'){
        CollapsibleBanner.showCollapsibleBanner({
          adUnitId: this.AdsIdControl?.Reminder_Ads?.ads_Collapsible_banner_reminder_id,
          collapsiblePosition: 'bottom', // or 'top'
          marginBottom: 40
        }).then(() => {
        }).catch(() => { }).finally(() => {
          setTimeout(() => {
            this.collapsibleAdSkeleton = false;
            this.cdr.detectChanges();
          }, 2000);
        });
      }
    } 

  backSetting() {
    this.loggerService.track('navigate_back_from_reminder');
    this.router.navigate(['main']);
  }

  disableAllReminders(event: any) {
    const isActive = event.detail.checked;
    this.disableReminders = isActive;

    this.loggerService.track(`reminders_toggled_${isActive}`);

    this.appStorageService.set('enableReminder', this.disableReminders);
    this.notificationService.customLocalNotifications();
    this.notificationService.defaultLocalNotifications();
  }

  updateDefaultReminders(index: number, active: boolean) {
    this.loggerService.track(`default_reminder_updated_${index}_${active}`);

    this.defaultTime[index].active = active;
    this.appStorageService.set('defaultReminder', this.defaultTime);
    this.notificationService.defaultLocalNotifications();
  }

  deleteTime(index: any) {
    this.loggerService.track(`custom_reminder_deleted_${index}`);

    //delete from current custom reminders
    this.storedCustomTime.update(times =>
      times.filter((_, i) => i !== index)
    );
    this.appStorageService.set('customTime', this.storedCustomTime());
    this.notificationService.customLocalNotifications();
  }

  changeHour(step: number) {
    this.loggerService.track(`change_hour_${step}`);
    this.hour = ((this.hour - 1 + step + 12) % 12) + 1;
    this.cdr.detectChanges();
  }

  changeMinute(step: number) {
    this.loggerService.track(`change_minute_${step}`);
    this.minute = (this.minute + step + 60) % 60;
    this.cdr.detectChanges();
  }

  format(value: number): string {
    return value.toString().padStart(2, '0');
  }

  setPeriod(value: 'AM' | 'PM') {
    this.loggerService.track(`period_set_${value}`);
    this.period = value;
  }

  toggleDay(day: string, checked: boolean) {
    this.loggerService.track(`day_toggled_${day}_${checked}`);

    if (checked) {
      this.selectedDays.push(day);
    } else {
      this.selectedDays = this.selectedDays.filter((d) => d !== day);
    }
  }

  formatDays(days: string[] = []) {
    const allDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const isEveryday = allDays.length === days.length && allDays.every(day => days.includes(day));

    if (isEveryday) {
      return 'Everyday';
    }
    return days.length ? days.join(', ') : '';
  }


  async saveCustomReminder() {
    const selectedTime = `${this.format(this.hour)}:${this.format(
      this.minute
    )} ${this.period}`;

    this.loggerService.track(`save_custom_reminder_clicked_${selectedTime}`);

    this.appStorageService.get('userId', '').then(async (UserID) => {
        if (UserID) {
          const user = await this.sqliteService.getUserById(UserID);

          const selectedDays = this.selectedDays?.length
            ? this.selectedDays
            : [];

          let time = {
            hour: selectedTime,
            active: true,
            userName: user?.userName || '',
            days: selectedDays,
          };

          this.storedCustomTime.update(times => [...times, time]);

          this.loggerService.track('custom_reminder_saved');

          this.appStorageService.set('customTime', this.storedCustomTime());
          this.notificationService.customLocalNotifications();

          if(this.accordionGroup){
            this.accordionGroup.value = [];
          }
        }
      }).catch(() => {
        this.loggerService.track('save_custom_reminder_failed');
      });
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