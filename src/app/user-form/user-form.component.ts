import { Component, ElementRef, signal, ViewChild } from '@angular/core';
import { SharedUtilService } from '../services/shared-util.service';
import { SqliteService } from '../services/sqlite.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AppStorageService } from '../services/app-storage.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { LoggerService } from '../services/analytic.service';
import { AdmobService } from '../services/admob.service';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule, FormsModule],
})
export class UserFormComponent {
  @ViewChild('weightSwiper', { static: false }) weightSwiperEl!: ElementRef;
  @ViewChild('heightCmSwiper') heightCmSwiperEl!: ElementRef;
  @ViewChild('heightFtSwiper') heightFtSwiperEl!: ElementRef;
  @ViewChild('dailyGoalInput') dailyGoalInput!: ElementRef;

  currentStep = 0;
  progress = 0;

  userData = {
    id: '',
    userName: '',
    userAge: 23,
    height: '4.5',
    weightUnit: 'kg',
    waterUnit: 'ml',
    heightUnit: 'ft',
    weight: '50',
    gender: 'Male',
    dailyGoal: 1000,
  };

  weights: number[] = [];
  minWeight = 0;
  maxWeight = 100;
  weightUnit: 'lb' | 'kg' = 'kg';

  heights: number[] = [];
  minHeight = 100;
  maxHeight = 200;
  heightUnit: 'cm' | 'ft' = 'cm';

  waterUnit: 'ml' | 'fl oz' = 'ml';
  presetMLGoals = [1500, 2000, 2500];
  presetOZGoals = [40, 50, 100];

  heightsFt: { ft: number; inch: number; label: string }[] = [];
  showSetupModal: boolean = false;

  editField: string | null = null;
  isEditMode: boolean = false;

  isPremiumPlan: boolean = false;
  AdsIdControl: any;
  nativeAdSkeleton= signal(false);

  isOnline: boolean = false;

  constructor(
    private shareService: SharedUtilService,
    private sqliteService: SqliteService,
    private router: Router,
    private route: ActivatedRoute,
    private appStorageService: AppStorageService,
    private translate: TranslateService,
    private loggerService: LoggerService,
    private admobService: AdmobService,
  ) {
    this.shareService.getNetworkStatus().subscribe((isOnline: boolean) => {
      this.isOnline = isOnline;
    });
  }

  ngOnInit(){
    this.loggerService.setScreen('userForm', 'userFormScreen');
    this.shareService.setScreen('userForm');

     this.appStorageService.get<boolean>('isPremiumPlan', false).then((isPremiumPlan) =>
      {
        this.isPremiumPlan = isPremiumPlan

        if(!isPremiumPlan){
          this.appStorageService.get('AdsControler', '').then((AdsIdControl) => {
            this.AdsIdControl = AdsIdControl;
            // native ad load
            if (
              this.AdsIdControl?.userForm_Ads?.ads_native_userForm_ad &&
              this.AdsIdControl?.userForm_Ads?.ads_native_userForm_id &&
              this.isOnline
            ) {
              this.showNativeAd();
            }
          }).catch(() => { });
        }
      } 

    ).catch(() => { });
    
  }

  async ngAfterViewInit() {
    this.editField = this.route.snapshot.queryParamMap.get('editField');
    if (this.editField) {
      this.loggerService.track('editModeEnter', { field: this.editField });
      // setTimeout(() => {
        this.goToSlideForEdit(this.editField);
        this.isEditMode = true;
      // }, 50);

      this.appStorageService.get('userId', '').then(async (userId) => {
          if (userId) {
            this.loggerService.track('loadingUserData');
            const user = await this.sqliteService.getUserById(userId);
            if (user) {
              this.loggerService.track('userDataLoaded');
              this.userData = user;
            }
          }
        })
        .catch(() => {});
    }

    for (let i = this.minWeight; i <= this.maxWeight; i++) this.weights.push(i);
    for (let i = this.minHeight; i <= this.maxHeight; i++) this.heights.push(i);

    for (let ft = 1; ft <= 8; ft++) {
      for (let inch = 0; inch < 12; inch++) {
        this.heightsFt.push({ ft, inch, label: `${ft}'${inch}"` });
      }
    }
  }

   ngAfterViewChecked() {
    // --- Step 3: Weight Swiper ---
    if (this.currentStep === 3 && this.weightSwiperEl?.nativeElement?.swiper) {
      const swiperEl = this.weightSwiperEl.nativeElement;
      const slideIndex = +this.userData?.weight - this.minWeight;
      swiperEl.swiper.slideTo(slideIndex, 0);
    }

    // --- Step 4: Height Swiper ---
    if (this.currentStep === 4) {
      // If user is using cm unit
      if (this.userData?.heightUnit === 'cm' && this.heightCmSwiperEl?.nativeElement?.swiper) {
        const swiperEl = this.heightCmSwiperEl.nativeElement;
        const slideIndex = +this.userData?.height - this.minHeight;
        swiperEl.swiper.slideTo(slideIndex, 0);
      }

      // If user is using ft unit
      if (this.userData?.heightUnit === 'ft' && this.heightFtSwiperEl?.nativeElement?.swiper) {
        const swiperEl = this.heightFtSwiperEl.nativeElement;

        // convert "4.5" (ft.inch) into index
        const [ft, inch] = this.userData?.height.split('.').map(Number);
        const index = this.heightsFt.findIndex(
          (h) => h.ft === ft && h.inch === inch
        );

        if (index >= 0) swiperEl.swiper.slideTo(index, 0);
      }
    }
  }

  /**
   * 
   * @param AdsIdControl 
   */
  showNativeAd() {
    this.nativeAdSkeleton.set(true);
    this.admobService.loadNativeAd(this.AdsIdControl?.userForm_Ads?.ads_native_userForm_id, 7000).then(async (res) => {
      this.nativeAdSkeleton.set(false);
      if (this.shareService.getScreen() === 'userForm' && res !=null) {
        this.admobService.showNativeAd(res.adId, 'FormAdId', 'user_form_medium_native').then((res) => { 
        }).catch(() => { });
      }
    }).catch(() => { });
  }

  goToSlideForEdit(field: string | null) {
    this.loggerService.track('navigateToEditStep', { field });
    switch (field) {
      case 'name': this.currentStep = 0; break;
      case 'age': this.currentStep = 1; break;
      case 'gender': this.currentStep = 2; break;
      case 'weight': this.currentStep = 3; break;
      case 'height': this.currentStep = 4; break;
      case 'waterGoal': this.currentStep = 5; break;
      default: this.currentStep = 0;
    }
  }

  onWeightSlideChange(event: any) {
    let currentIndex = event.detail[0].activeIndex;
    this.userData.weight = this.weights[currentIndex].toString();
    this.loggerService.track('weightChanged', { weight: this.userData.weight });
  }

  onHeightSlideChange(event: any) {
    let currentIndex = event.detail[0].activeIndex;
    this.userData.height = this.heights[currentIndex].toString();
    this.loggerService.track('heightChangedCM', { height: this.userData.height });
  }

  onHeightFtSlideChange(event: any) {
    const currentIndex = event.detail[0].activeIndex;
    const selected = this.heightsFt[currentIndex];

    if (selected) {
      this.userData.height = `${selected.ft}.${selected.inch}`;
      this.loggerService.track('heightChangedFT', { height: this.userData.height });
    }
  }

  setWeightUnit() {
    this.loggerService.track('weightUnitChanged', { unit: this.userData.weightUnit });
    this.userData.weight = '50';
  }

  setHeightUnit() {
    this.loggerService.track('heightUnitChanged', { unit: this.userData.heightUnit });
    if (this.userData.heightUnit === 'ft') this.userData.height = '4.5';
    else this.userData.height = '150';
  }

  setGoal(goal: number) {
    this.loggerService.track('waterGoalPresetSelected', { goal });
    this.userData.dailyGoal = goal;
    setTimeout(() => {
      this.userData = { ...this.userData };
    }, 0);
  }

  focusDailyGoalInput() {
    this.loggerService.track('dailyGoalInputFocused');
    if (this.dailyGoalInput) this.dailyGoalInput.nativeElement.focus();
  }

  nextStep() {
    this.loggerService.track('stepNextAttempt', { step: this.currentStep });

    if (this.currentStep === 0 && this.userData?.userName === '') {
      this.loggerService.track('nameValidationFailed');
      const message = this.translate.instant('USER_FORM.PLEASE_COMPLETE_FIELD');
      this.shareService.showToaster(message, 'top');
      return;
    }

    if (this.currentStep < 5) {
      this.currentStep++;
      this.updateProgress();
      this.loggerService.track('stepChanged', { step: this.currentStep });
    } else {
      this.loggerService.track('createUserAttempt');
      this.userData.id = this.generateUniqueId();
      this.sqliteService.addUser(this.userData).then((res) => {
          if (res) {
            this.loggerService.track('userCreated');
            this.progress = 100;
            setTimeout(() => {
              this.appStorageService.set('userId', this.userData.id);
              this.appStorageService.set('waterUnit', this.userData?.waterUnit);
              this.showSetupModal = true;
              this.loggerService.track('setupModalOpened');
            }, 100);
          }
        })
        .catch(() => {
          this.loggerService.track('userCreateFailed');
          const message = this.translate.instant('USER_FORM.ERROR_SAVING_USER_DATA');
          this.shareService.showToaster(message, 'top');
        });
    }
  }

  isCurrentStepValid(): boolean {
    return true;
  }

  /**
   * Generates a unique ID string using the current timestamp and a random value.
   */
  private generateUniqueId(): string {
    return (
      new Date().getTime().toString(16) + Math.random().toString(16).substring(2)
    );
  }

  prevStep() {
    this.loggerService.track('stepPrevious', { step: this.currentStep });
    if (this.currentStep > 0) {
      this.currentStep--;
      this.updateProgress();
    }
  }

  updateProgress() {
    this.progress = (this.currentStep / 6) * 100;
  }

  goToNextPage() {
    this.loggerService.track('subscriptionRedirect', {});
    this.showSetupModal = false;
    setTimeout(() => {
      this.router.navigate(['/subscribe'], {
        queryParams: { isHomeCheck: true },
      });
    }, 10);
  }

  async saveChanges() {
    this.loggerService.track('saveChangesAttempt', {});
    const success = await this.sqliteService.updateUser(this.userData);

    if (success) {
      this.loggerService.track('profileUpdated', {});
      this.appStorageService.set('waterUnit', this.userData?.waterUnit);
      const message = this.translate.instant('USER_FORM.PROFILE_UPDATE_SUCCESS');
      this.shareService.showToaster(message, 'top');
      setTimeout(() => {
        this.router.navigate(['/settings']);
      }, 100);
    } else {
      this.loggerService.track('profileUpdateFailed', {});
      const message = this.translate.instant('USER_FORM.FAILED_UPDATE_WATER_UNIT');
      this.shareService.showToaster(message, 'top');
    }
  }

  /**
   * On destroy
   */
  ngOnDestroy() {
    if (!this.isPremiumPlan) {
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