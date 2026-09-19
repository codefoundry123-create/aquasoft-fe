import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { LoggerService } from '../services/analytic.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppStorageService } from '../services/app-storage.service';
import { SharedUtilService } from '../services/shared-util.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { SubscriptionManager } from '../CustomPlugin/inAppPurchase';

@Component({
  selector: 'app-subscription',
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule, FormsModule],
})
export class SubscriptionComponent {
  selectedProduct: string = '';
  isHomeCheck: boolean = false;
  subscriptionProducts: any[] = [];
  userBuyproduct: any;
  activeProductIds: string[] = [];

  constructor(
    private loggerService: LoggerService,
    private appStorageService: AppStorageService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private sharedUtilService: SharedUtilService,
  ) {}

  ngOnInit(): void {
    this.loggerService.setScreen('subscription', 'subscriptionScreen');
    this.loggerService.track('subscription_screen');

    this.route.queryParams.subscribe((params: any) => {
      if (params?.isHomeCheck) {
        this.isHomeCheck = params.isHomeCheck == 'true';
        this.loggerService.track('subscription_param_isHomeCheck', {
          isHomeCheck: this.isHomeCheck,
        });
      }
    });

    SubscriptionManager.getProducts({
      productIds: ['weeklyadsfree', 'monthlyadsfree', 'annuallyadsfree'],
      type: 'subs',
    }).then((Products: any) => {
        if (Products?.products) {
          this.subscriptionProducts = Products.products;
          this.loggerService.track('subscription_products_fetched', {
            products_count: this.subscriptionProducts.length,
          });

          if (this.subscriptionProducts.length > 0) {
            this.selectedProduct = this.subscriptionProducts[0];
            this.userBuyproduct = this.subscriptionProducts[0]?.productId;
            this.loggerService.track('subscription_default_product_set', {
              defaultProduct: this.userBuyproduct,
            });
          }
        }
      }).catch((err) => { });

    this.subscriptionActivePurchases();

    SubscriptionManager.addListener('purchaseCompleted', (purchaseCompleted: any) => {
      try {
        if (purchaseCompleted) {
          this.loggerService.track('subscription_purchase_completed_listener', {
            productId: purchaseCompleted?.productId,
          });

          this.appStorageService.set('purchaseCompleted', purchaseCompleted);
          this.appStorageService.set('isPremiumPlan', true);
          window.location.reload();
        }
      } catch (error) {
        this.loggerService.track('subscription_purchase_completed_listener_error', {
          error,
        });
      }
    });
  }

  async subscriptionActivePurchases() {
    await SubscriptionManager.getActivePurchases().then((getActivePurchases: any) => {

        if (getActivePurchases?.subscriptions?.length) {
          this.activeProductIds = getActivePurchases.subscriptions.filter((sub: any) => sub?.autoRenewing === true)
              .map((sub: any) => sub?.productId) || [];

          this.loggerService.track('subscription_active_purchases_fetched', {
            count: this.activeProductIds.length,
          });

        } else {
          this.activeProductIds = [];
          this.loggerService.track('subscription_active_purchases_empty');
        }
      })
      .catch((error) => {
        this.activeProductIds = [];
        this.loggerService.track('subscription_active_purchases_error', {
          error,
        });
      });
  }

  close() {
    this.loggerService.track('subscription_close_clicked', {from_home: this.isHomeCheck, });

    if (this.isHomeCheck) {
      this.router.navigate(['/main']);
    } else {
      this.router.navigate(['/settings']);
    }
  }

  selectProduct(value: any) {
    this.userBuyproduct = value.productId;
    this.loggerService.track('subscription_product_selected', {
      selectedProduct: this.userBuyproduct,
    });
  }

  async Subscription() {
    this.loggerService.track('subscription_purchase_attempt', {
      productId: this.userBuyproduct,
    });

    if (this.userBuyproduct) {
      await SubscriptionManager.purchase({ productId: this.userBuyproduct, type: 'subs' })
        .then((purchase) => {
          this.loggerService.track('subscription_purchase_success', {
            productId: this.userBuyproduct,
          });
        })
        .catch((error) => {
          this.loggerService.track('subscription_purchase_failed', {
            productId: this.userBuyproduct,
            error,
          });

          const message = this.translate.instant('SUBSCRIPTION.PURCHASE_ERROR');
          this.sharedUtilService.showToaster(message, 'top');
        });
    } else {
      this.loggerService.track('subscription_purchase_no_product_selected');

      const message = this.translate.instant('SUBSCRIPTION.SELECT_PACKAGE_WARNING');
      this.sharedUtilService.showToaster(message, 'top');
    }
  }

  cancelSubscription() {
    this.loggerService.track('subscription_cancel_clicked');
    const url = 'https://play.google.com/store/account/subscriptions';
    window.open(url, '_blank');
  }

  openPrivacyPolicy() {
    this.loggerService.track('subscription_privacy_policy_opened');
    window.open(environment.privacyPolicy, '_blank');
  }

  openTermsOfuse() {
    this.loggerService.track('subscription_terms_opened');
    window.open(environment.termsOfUse, '_blank');
  }
}
