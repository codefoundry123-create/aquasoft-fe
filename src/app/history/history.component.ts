import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import * as Highcharts from 'highcharts';
import { LoggerService } from '../services/analytic.service';
import { Router } from '@angular/router';
import { SqliteService } from '../services/sqlite.service';
import { AppStorageService } from '../services/app-storage.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HighchartsChartModule } from 'highcharts-angular';
import { TranslateModule } from '@ngx-translate/core';
import { AdmobService } from '../services/admob.service';
import { SharedUtilService } from '../services/shared-util.service';
import { CollapsibleBanner } from '../CustomPlugin/CollapsibleBanner';

@Component({
  selector: 'history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, HighchartsChartModule, TranslateModule],
})

export class HistoryComponent implements OnInit {
  userId: string = '';
  selectedTab = 'Weekly';

  weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  weeks: any = [];

  weeklyValues: { [day: string]: number } = {};
  monthlyValues: { [week: string]: number } = {};
  yearlyValues: { [month: string]: number } = {};

  weeklyAverage: string = '';
  monthlyAverage: string = '';
  yearlyAverage: string = '';

  selectedDay: string;
  Highcharts: any = Highcharts;
  chartOptions: any;

  AdsIdControl: any;
  isPremiumPlan: boolean = false;
  isOnline: boolean = false;
  nativeAdSkeleton = signal(false);
  collapsibleAdSkeleton = signal(false) ;

  constructor(
    private loggerService: LoggerService,
    private router: Router,
    private sqliteService: SqliteService,
    private cdr: ChangeDetectorRef,
    private appStorageService: AppStorageService,
    private admobService: AdmobService,
    private shareService: SharedUtilService
  ) {
    this.shareService.getNetworkStatus().subscribe((isOnline: boolean) => {
      this.isOnline = isOnline;
    });
  }

  async ngOnInit(): Promise<void> {
    this.loggerService.track('history_screen_opened');
    this.loggerService.setScreen('History', 'HistoryScreen');

    await this.appStorageService.get('userId', '').then((userId) => {
      this.userId = userId;
    }).catch(() => { });

    this.loadChartData(this.selectedTab);
    this.setActiveSelection();
    this.weeks = this.generateWeeksOfMonth();
    this.loadAllAverages();

    this.appStorageService.get<boolean>('isPremiumPlan', false).then((isPremiumPlan) => {
      this.isPremiumPlan = isPremiumPlan

      if(!isPremiumPlan){
        this.appStorageService.get('AdsControler', '').then((AdsIdControl) => {
          this.AdsIdControl = AdsIdControl;
          this.shareService.setScreen('history');
          // native ad load
          if (
            this.AdsIdControl?.History_Ads?.enable &&
            this.AdsIdControl?.History_Ads?.ad_type === '1' &&
            this.AdsIdControl?.History_Ads?.ads_native_history_id &&
            this.isOnline
          ) {
            this.showNativeAd();
          } else if (
            this.AdsIdControl?.History_Ads?.enable &&
            this.AdsIdControl?.History_Ads?.ad_type === '2' &&
            this.AdsIdControl?.History_Ads?.ads_Collapsible_banner_history_id &&
            this.isOnline
          ) {
            this.showCollapsibleBannerAd();
          } else { }
        }).catch(() => { });
      }
    }

    ).catch(() => { });
  }

  async loadAllAverages() {
    if (this.userId) {
      const averages = await this.sqliteService.getAllAverages(this.userId);
      this.weeklyAverage = averages.weeklyAverage.toFixed(0);
      this.monthlyAverage = averages.monthlyAverage.toFixed(0);
      this.yearlyAverage = averages.yearlyAverage.toFixed(0);
      this.loggerService.track('history_averages_loaded', averages);
    }
  }

  generateWeeksOfMonth(): any[] {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks = [];
    let startDay = 1;

    while (startDay <= daysInMonth) {
      const endDay = Math.min(startDay + 6, daysInMonth);
      weeks.push({ label: `W${weeks.length + 1}`, range: `${startDay}-${endDay} D` });
      startDay += 7;
    }

    this.loggerService.track('history_weeks_generated', { weeks });
    return weeks;
  }

  async loadChartData(period: string) {
    this.loggerService.track('history_load_chart_data', { period });
    let chartData: any[] = [];

    if (period === 'Weekly') chartData = await this.sqliteService.getWeeklySummary(this.userId);
    else if (period === 'Monthly') {
      const now = new Date();
      chartData = await this.sqliteService.getMonthlySummary(this.userId, now.getMonth() + 1, now.getFullYear());
    } else if (period === 'Yearly') chartData = await this.sqliteService.getYearlySummary(this.userId);

    let categories: string[] = [];
    let values: number[] = [];

    if (period === 'Weekly') {
      const weekDays = this.weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      categories = weekDays;
      const totalsByDay: Record<string, number> = {};

      chartData.forEach(d => {
        const dayName = weekDays[new Date(d.date).getDay()];
        totalsByDay[dayName] = Number(d.totalDrunk) || 0;
      });

      values = categories.map(day => totalsByDay[day] || 0);
      this.weeklyValues = totalsByDay;
    } else if (period === 'Monthly') {
      const weeks = this.generateWeeksOfMonth();
      categories = weeks.map(w => w.label);

      const weekTotals: number[] = new Array(weeks.length).fill(0);
      chartData.forEach(d => {
        const dateObj = new Date(d.date);
        const dayOfMonth = dateObj.getDate();
        const weekIndex = Math.min(Math.floor((dayOfMonth - 1) / 7), weeks.length - 1);
        weekTotals[weekIndex] += Number(d.totalDrunk) || 0;
      });

      values = weekTotals;
      this.monthlyValues = {};
      weeks.forEach((w, i) => this.monthlyValues[w.label] = values[i]);
    } else if (period === 'Yearly') {
      categories = this.months;
      const totalsByMonth: Record<string, number> = {};
      chartData.forEach(d => {
        const monthNum = parseInt(d.date.split('-')[1], 10);
        const monthName = categories[monthNum - 1];
        totalsByMonth[monthName] = Number(d.totalDrunk) || 0;
      });
      values = categories.map(m => totalsByMonth[m] || 0);
      this.yearlyValues = totalsByMonth;
    }

    this.chartOptions = {
      chart: { type: 'column', backgroundColor: 'transparent', style: { fontFamily: 'Poppins, sans-serif' } },
      title: { text: '' },
      xAxis: { categories, labels: { style: { color: '#666', fontSize: '12px' } }, lineColor: '#ddd', tickColor: '#ddd' },
      yAxis: { title: { text: '' }, labels: { style: { color: '#666', fontSize: '12px' } }, gridLineColor: '#eee' },
      plotOptions: { column: { borderRadius: 6, pointPadding: 0.2, borderWidth: 0, color: '#4A90E2', states: { hover: { brightness: 0.1 } } } },
      series: [{ name: 'Water Drunk (ml)', type: 'column', data: values, color: '#4A90E2', showInLegend: false }],
      tooltip: { pointFormat: '{series.name}: <b>{point.y} ml</b>' },
      credits: { enabled: false },
    };

    this.cdr.detectChanges();
  }

  setActiveSelection() {
    const now = new Date();

    if (this.selectedTab === 'Weekly') {
      const dayIndex = now.getDay();
      const dayName = this.weekDays[(dayIndex + 6) % 7];
      this.selectedDay = dayName;
    } else if (this.selectedTab === 'Monthly') {
      const dayOfMonth = now.getDate();
      const weekIndex = Math.min(Math.floor((dayOfMonth - 1) / 7), this.weeks.length - 1);
      this.selectedDay = this.weeks[weekIndex].label;
    } else if (this.selectedTab === 'Yearly') {
      this.selectedDay = this.months[now.getMonth()];
    }

    this.loggerService.track('history_active_selection_set', { selectedTab: this.selectedTab, selectedDay: this.selectedDay });
    this.cdr.detectChanges();
  }


  /**
   * Show native ad
   */
  showNativeAd() {
    this.nativeAdSkeleton.set(true);
    this.admobService.loadNativeAd(this.AdsIdControl?.History_Ads?.ads_native_history_id, 7000).then(async (res) => {
      this.nativeAdSkeleton.set(false);
      if (this.shareService.getScreen() === 'history' && res != null) {
        this.admobService.showNativeAd(res.adId, 'HistoryAdId', 'history_medium_native').then((res) => {
        }).catch(() => { })
      }
    }).catch(() => { });
  }


  /**
  * show Collapsible Banner
  */
  showCollapsibleBannerAd() {
    this.collapsibleAdSkeleton.set(true);
    CollapsibleBanner.showCollapsibleBanner({
      adUnitId: this.AdsIdControl?.History_Ads?.ads_Collapsible_banner_history_id,
      collapsiblePosition: 'bottom', // or 'top'
      marginBottom: 40
    }).then(() => {
    }).catch(() => { }).finally(() => {
      setTimeout(() => {
        this.collapsibleAdSkeleton.set(false);
      }, 2000);
    });
  }

  goToMain() {
    this.loggerService.track('history_go_to_main');
    this.router.navigate(['main']);
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    this.loggerService.track('history_tab_selected', { tab });
    this.loadChartData(this.selectedTab);
    this.setActiveSelection();
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