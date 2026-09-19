import { Component, OnDestroy, OnInit, } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from 'src/environments/environment';
import { AdmobService } from '../services/admob.service';
import { LoggerService } from '../services/analytic.service';
import { SharedUtilService } from '../services/shared-util.service';
import { AppStorageService } from '../services/app-storage.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-language',
  templateUrl: './language.component.html',
  styleUrls: ['./language.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule
  ],
})
export class LanguageComponent implements OnInit, OnDestroy {
  showBackCheck: boolean = false;
  appName = environment.AppName;
  isIosDevice: boolean = false;
  selectedLanguage: any = null;
  selectedLanguageCode: string = 'en';
  searchValue: string = '';
  noLanguageFound: boolean = false;
  crossbtnCheck: boolean = false;

  languages: any[] = [
    { name: 'Afrikaans-Afrikaans', code: 'af', country: 'za' },
    { name: 'Arabic-العربية', code: 'ar', country: 'sa' },
    { name: 'Dutch-Nederlands', code: 'nl', country: 'nl' },
    { name: 'English-English', code: 'en', country: 'us' },
    { name: 'Filipino-Filipino', code: 'fil', country: 'ph' },
    { name: 'Finnish-Suomi', code: 'fi', country: 'fi' },
    { name: 'French-Français', code: 'fr', country: 'fr' },
    { name: 'Georgian-ქართული', code: 'ka', country: 'ge' },
    { name: 'German-Deutsch', code: 'de', country: 'de' },
    { name: 'Hindi-हिंदी', code: 'hi', country: 'in' },
    { name: 'Indonesian-Indonesia', code: 'id', country: 'id' },
    { name: 'Italian-Italiano', code: 'it', country: 'it' },
    { name: 'Japanese-日本語', code: 'ja', country: 'jp' },
    { name: 'Korean-한국어', code: 'ko', country: 'kr' },
    { name: 'Malay-Melayu', code: 'ms', country: 'my' },
    { name: 'Norwegian-Norsk', code: 'no', country: 'no' },
    { name: 'Persian-فارسی', code: 'fa', country: 'ir' },
    { name: 'Polish-Polski', code: 'pl', country: 'pl' },
    { name: 'Portuguese-Português', code: 'pt', country: 'pt' },
    { name: 'Spanish-Español', code: 'es', country: 'es' },
    { name: 'Thai-แบบไทย', code: 'th', country: 'th' },
    { name: 'Turkish-Türkçe', code: 'tr', country: 'tr' },
  ];

  results = [...this.languages];
  isPremiumPlan: boolean = false;
  adSkeleton: boolean = false;

  showSmallLoader = false;

  source: string = '';

  constructor(
    private router: Router,
    private translate: TranslateService,
    private admobService: AdmobService,
    private loggerService: LoggerService,
    private sharedUtilService: SharedUtilService,
    private appStorageService: AppStorageService,
    private route: ActivatedRoute,
  ) {
    this.translate.setDefaultLang('en'); // Set default language

    this.translate.addLangs(this.languages.map((languages) => languages.code));
    // this.initializeLanguage();
  }

  async ngOnInit(): Promise<void> {
    this.loggerService.setScreen("Language", 'LanguageScreen');
    this.sharedUtilService.setScreen("language");
    this.loggerService.track('language_screen');


    this.appStorageService.get<boolean>('isPremiumPlan', false).then((isPremiumPlan) => {
      this.isPremiumPlan = isPremiumPlan;
      this.handleLanguageScreenAds();
    });

    this.route.queryParams.subscribe((params: any) => {
      this.source = params['source'];
    });
  }

  handleLanguageScreenAds() {
    this.loggerService.track('language_ads_check');

    if (!this.isPremiumPlan) {
      this.appStorageService.get<any>('AdsControler', '').then((AdsIdControl: any) => {

        const getScreen = this.sharedUtilService.getScreen();

        if (
          AdsIdControl &&
          AdsIdControl?.Language_Ads?.ads_language_ad &&
          AdsIdControl?.Language_Ads?.ads_native_language_id &&
          AdsIdControl?.Language_Ads?.ad_type === "1"
        ) {
          this.adSkeleton = true;

          this.admobService.loadNativeAd(AdsIdControl?.Language_Ads?.ads_native_language_id, 7000).then((res) => {
            this.loggerService.track('language_native_ad_loaded');

            if (getScreen === 'language' && res != null) {
              this.admobService.showNativeAd(res.adId, 'LanguageAdId', 'lang_medium_native').then(() => {
                this.loggerService.track('language_native_ad_shown');
              }).catch(() => {
                this.loggerService.track('language_native_ad_show_error');
              });
            }
          }).catch(() => {
            this.loggerService.track('language_native_ad_load_error');
          });
        }

        if (
          AdsIdControl &&
          AdsIdControl?.Language_Ads?.ads_language_ad &&
          AdsIdControl?.Language_Ads?.ads_banner_language_id &&
          AdsIdControl?.Language_Ads?.ad_type === "2"
        ) {
          this.loggerService.track('language_banner_ads_start');

          this.adSkeleton = true;

          const bannerDetails = {
            id: AdsIdControl?.Language_Ads?.ads_banner_language_id,
            type: "medium_rectangle",
            margin: 40,
            collapsible: false
          };

          if (getScreen === 'language') {
            this.admobService.startBannerAdRefresh(bannerDetails).then(() => {
              this.loggerService.track('language_banner_ad_shown');
            }).catch(() => {
              this.loggerService.track('language_banner_ad_error');
            });
          }
        }
      }).catch(() => {
        this.loggerService.track('language_ads_controller_error');
      });
    }
  }

  async initializeLanguage() {
    this.loggerService.track('language_initialize_start');

    this.appStorageService.get('selectedLanguage', '').then((savedLang) => {
      if (savedLang) {
        const defaultLang = JSON.parse(savedLang);
        this.selectedLanguage =
          this.languages.find(lang => lang.code === defaultLang.code);
        this.loggerService.track('language_saved_language_loaded');
      } else {
        this.selectedLanguage = null;
        this.loggerService.track('language_no_saved_language');
      }

      this.selectedLanguageCode = this.selectedLanguage?.code || '';

      this.results = this.selectedLanguage
        ? [this.selectedLanguage, ...this.languages.filter(lang => lang.code !== this.selectedLanguage.code)]
        : [...this.languages];

    }).catch(() => {
      this.loggerService.track('language_saved_language_error');
    });
    this.loggerService.track('language_initialize_complete');
  }

  apply() {
    this.loggerService.track('language_apply_click');

    if (
      this.selectedLanguageCode &&
      this.languages.some((lang) => lang.code === this.selectedLanguageCode)
    ) {
      this.translate.use(this.selectedLanguageCode);
      this.appStorageService.set('selectedLanguage', this.selectedLanguage);
      this.loggerService.track('language_applied_success');
    } else {
      this.translate.use('en');
      this.loggerService.track('language_apply_default_fallback');
    }

    this.continue();
  }

  continue() {
    this.loggerService.track('language_continue_start');

    if (this.source === 'welcome') {
      this.loggerService.track('language_continue_from_welcome');

      this.appStorageService.get('userId', '').then((userID) => {
          if (userID) {
            this.loggerService.track('language_continue_second_time_user');
            this.router.navigate(['/subscribe'], { queryParams: { isHomeCheck: true } });
          } else {
            this.loggerService.track('language_continue_first_time_user');
            this.router.navigate(['/tutorial'], { queryParams: { source: 'language' } });
          }
        }).catch(() => {
          this.loggerService.track('language_continue_userid_error');
        });

    } else if (this.source === 'settings') {
      this.loggerService.track('language_continue_from_settings');
      this.router.navigate(["/settings"]);
    } else {
      this.loggerService.track('language_continue_no_source');
    }
  }

  onSelected(result: any): void {
    this.loggerService.track('language_select_item');

    this.showSmallLoader = true;
    this.selectedLanguage = '';

    setTimeout(() => {
      this.showSmallLoader = false;

      this.selectedLanguageCode = result.code;
      this.selectedLanguage = result;

      this.loggerService.track(`language_selected_${result.code}`);

      this.results = [result, ...this.languages.filter(lang => lang.code !== result.code)];
    }, 1500);
  }

  ngOnDestroy(): void {
    this.loggerService.track('language_destroy_start');

    if (!this.isPremiumPlan) {
      this.admobService.removeBannerAd();

      this.appStorageService.get('currentNativeLoadID', '')
        .then((currentNativeLoadID) => {
          if (currentNativeLoadID && currentNativeLoadID != null) {
            this.admobService.removeNativeAd(currentNativeLoadID);
            this.appStorageService.remove('currentNativeLoadID');
            this.loggerService.track('language_native_removed');
          }
        })
        .catch(() => this.loggerService.track('language_native_remove_error'));
    }
  }
}
