import { Injectable } from '@angular/core';
import { LocalNotificationSchema, LocalNotifications } from '@capacitor/local-notifications';
import { environment } from 'src/environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { SqliteService } from './sqlite.service';
import { AppStorageService } from './app-storage.service';
import { SharedUtilService } from './shared-util.service';

@Injectable({
  providedIn: 'root',
})
export class LocalNotificationService {
  appName = environment.AppName;

  constructor(
    private appStorageService: AppStorageService,
    private sharedUtilService: SharedUtilService,
    private translate: TranslateService,
    private sqliteService: SqliteService
  ) {}

  /**
   * Custom notifications
   */
  async customLocalNotifications() {
    try {
      const notif = await LocalNotifications.checkPermissions();

      if ((typeof notif === 'string' && notif === 'granted') || notif?.display === 'granted') {
        const customAlertsAll =
          (await this.appStorageService.get<any[]>('customTime', [])) || [];
        const customAlerts = customAlertsAll.filter((res: any) => res.active === true);
        const enableForm = (await this.appStorageService.get<string>('enableReminder', 'true')) === 'true';

        const defaultWeekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        if (!customAlerts.length || !enableForm) {
          for (let i = 0; i < customAlertsAll.length; i++) {
            await LocalNotifications.cancel({ notifications: [{ id: 100 + i }] });
          }
          return;
        }

        const message = `Hi, ${customAlerts[0]?.userName || ''}. It's time to drink water`;
        for (let i = 0; i < customAlerts.length; i++) {
          const alert = customAlerts[i];
          const id = 100 + i;

          if (alert?.active && alert?.hour) {
            const days = alert.days && alert.days.length ? alert.days : defaultWeekDays;
            const scheduleList = this.createWeeklySchedules(alert.hour, id, message, days);

            for (const schedule of scheduleList) {
              await LocalNotifications.schedule({ notifications: [schedule] });
            }
          } else {
            await LocalNotifications.cancel({ notifications: [{ id }] });
          }
        }
      } else {
        const permStatus = await LocalNotifications.requestPermissions();
        if (
          (typeof permStatus === 'string' && permStatus === 'denied') ||
          permStatus?.display === 'denied'
        ) {
          this.sharedUtilService.showToaster(this.translate.instant('NOTIFICATION_SERVICE.NOTIFICATION_PERMISSION_DENIED'), 'top');
        }
      }
    } catch (error) {}
  }

  createWeeklySchedules(time: string, baseId: number, message: string, days: string[]) {
    const schedules: LocalNotificationSchema[] = [];
    const dayMap: any = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

    const [timePart, meridian] = time.split(' ');
    let [hour, minute] = timePart.split(':').map(Number);

    if (meridian === 'PM' && hour < 12) hour += 12;
    if (meridian === 'AM' && hour === 12) hour = 0;

    days.forEach((day, idx) => {
      schedules.push({
        id: baseId + idx,
        title: message,
        body: 'Drink & submit your water intake:',
        sound: 'true',
        channelId: 'localNotification',
        actionTypeId: 'waterIntakeActions',
        schedule: {
          on: {
            weekday: dayMap[day],
            hour: hour,
            minute: minute,
          },
          repeats: true,
        },
      });
    });

    return schedules;
  }



  /**
   * set schedule object
   * Notification time @param notificationTime
   * index of notification @param i
   * message for show in notification @param message
   * @returns
   */
  setSchedule(notificationTime: any, id: any, message: any): LocalNotificationSchema {
    LocalNotifications.createChannel({
      id: 'localNotification',
      name: 'local',
      vibration: true,
      visibility: 1,
      importance: 5,
      lights: true,
      lightColor: 'green',
      sound: 'water.wav',
    });

    // water unit
    let waterunit = 'ml';
    this.appStorageService.get<string>('waterUnit', 'ml').then((val) => (waterunit = val));

    LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'waterIntakeActions',
          actions: [
            {
              id: waterunit === 'ml' ? '150' : '5',
              title: waterunit === 'ml' ? '150ML' : '5FL OZ',
            },
            {
              id: waterunit === 'ml' ? '300' : '10',
              title: waterunit === 'ml' ? '300ML' : '10FL OZ',
            },
            {
              id: waterunit === 'ml' ? '400' : '13',
              title: waterunit === 'ml' ? '400ML' : '13FL OZ',
            },
          ],
        },
      ],
    });

    const time: any = notificationTime;
    const splitted = time?.split(' ');
    let hour;
    let minute;

    if (splitted?.length) {
      const splittedTime = splitted[0].split(':');

      if (splittedTime?.length) {
        hour = Number(splittedTime[0]);
        minute = Number(splittedTime[1]);
      }

      if (splitted.length > 1 && splitted[1] == 'PM' && hour) {
        hour = hour + 12;
      }
    }

    return {
      id: id,
      title: message,
      body: 'Drink & submit your water intake:',
      sound: 'true',
      channelId: 'localNotification',
      schedule: {
        on: {
          hour: hour,
          minute: minute,
          second: 1,
        },
      },
      actionTypeId: 'waterIntakeActions',
    };
  }

  /**
   * Default notifications
   */
  async defaultLocalNotifications() {
    try {
      const notif = await LocalNotifications.checkPermissions();

      if ((typeof notif === 'string' && notif === 'granted') || notif?.display === 'granted') {
        const defaultAlertsAll =
          (await this.appStorageService.get<any[]>('defaultReminder', [])) || [];
        const defaultAlerts = defaultAlertsAll.filter((res: any) => res.active === true);
        const enableForm =
          (await this.appStorageService.get<string>('enableReminder', 'true')) === 'true';

        const UserID = await this.appStorageService.get<string>('userId', '');

        if (UserID) {
          const user = await this.sqliteService.getUserById(UserID);
          const message = `Hi, ${user?.userName || ''}. It's time to drink water`;

          if (defaultAlerts.length && enableForm === true) {
            for (let i = 0; i < defaultAlerts.length; i++) {
              const id = 2000 + i;
              const schedule = this.setSchedule(defaultAlerts[i].hour, id, message);

              await LocalNotifications.schedule({
                notifications: [schedule],
              });
            }
          } else {
            for (let i = 0; i < defaultAlertsAll.length; i++) {
              const id = 2000 + i;
              await LocalNotifications.cancel({ notifications: [{ id }] });
            }
          }
        }
      } else {
        const permStatus = await LocalNotifications.requestPermissions();
        if (
          (typeof permStatus === 'string' && permStatus === 'denied') ||
          permStatus?.display === 'denied'
        ) {
          this.sharedUtilService.showToaster(this.translate.instant('NOTIFICATION_SERVICE.PLEASE_ALLOW_NOTIFICATION_TO_GET_DAILY_UPDATES'), 'top');
        }
      }
    } catch (error) {}
  }

  /**
   * Get next upcoming notification
   */
  async getNextNotification(): Promise<any> {
    const customAlertsAll =
      (await this.appStorageService.get<any[]>('customTime', [])) || [];
    const defaultAlertsAll =
      (await this.appStorageService.get<any[]>('defaultReminder', [])) || [];

    const all = [...customAlertsAll, ...defaultAlertsAll].filter((n: any) => n.active);

    if (all.length === 0) return null;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const upcoming = all.map((n) => {
      const [timePart, meridian] = n.hour.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);

      if (meridian === 'PM' && hours < 12) hours += 12;
      if (meridian === 'AM' && hours === 12) hours = 0;

      const totalMinutes = hours * 60 + minutes;

      return { ...n, totalMinutes };
    });

    const future = upcoming.filter((n) => n.totalMinutes > nowMinutes);
    if (future.length === 0) return null;

    future.sort((a, b) => a.totalMinutes - b.totalMinutes);
    return future[0].hour;
  }
}
