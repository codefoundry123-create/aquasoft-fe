package com.waterreminderdailyfitness.app;
import android.app.Activity;
import android.util.Log;
import androidx.annotation.NonNull;
import com.getcapacitor.*;
import com.android.billingclient.api.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.*;
@CapacitorPlugin(name = "SubscriptionManager")
public class SubscriptionManagerPlugin extends Plugin implements PurchasesUpdatedListener {
  private BillingClient billingClient;
  private PluginCall pendingCall;
  private static final String LOG_TAG = "subscriptionPlugin";
  private boolean billingClientReady = false;
  private boolean isConnecting = false;
  private final Queue<Runnable> billingReadyQueue = new ArrayDeque<>();
  @Override
  public void load() {
    Log.d(LOG_TAG, "load called ");
    billingClient = BillingClient.newBuilder(getContext())
      .setListener(this)
      .enablePendingPurchases(
        PendingPurchasesParams.newBuilder()
          .enableOneTimeProducts() // allow pending one-time purchases
          .build())
      .build();
    startBillingConnection();
  }
  private synchronized void startBillingConnection() {
    if (billingClient == null)
      return;
    if (billingClient.isReady() || isConnecting)
      return;
    isConnecting = true;
    billingClient.startConnection(new BillingClientStateListener() {
      @Override
      public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
        isConnecting = false;
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
          billingClientReady = true;
          Log.d(LOG_TAG, "Billing setup finished. Billing client ready.");
          notifyListeners("billingConnected", new JSObject());
          ThreadUtil.runOnMain(() -> {
            while (!billingReadyQueue.isEmpty()) {
              try {
                billingReadyQueue.poll().run();
              } catch (Exception e) {
                Log.e(LOG_TAG, "Error running queued billing task", e);
              }
            }
          });
        } else {
          billingClientReady = false;
          Log.w(LOG_TAG, "Billing setup finished with non-OK: " + billingResult.getDebugMessage());
          notifyListeners("billingDisconnected", new JSObject());
        }
      }
      @Override
      public void onBillingServiceDisconnected() {
        billingClientReady = false;
        Log.w(LOG_TAG, "Billing service disconnected");
        notifyListeners("billingDisconnected", new JSObject());
      }
    });
  }
  private void ensureBillingClientReady(Runnable runnable) {
    if (billingClient != null && billingClient.isReady() && billingClientReady) {
      ThreadUtil.runOnMain(runnable);
      return;
    }
    billingReadyQueue.add(runnable);
    startBillingConnection();
  }
  // Get Active Purchases
  @PluginMethod
  public void getActivePurchases(PluginCall call) {
    Log.d(LOG_TAG, "getActivePurchases called ");
    ensureBillingClientReady(() -> {
      billingClient.queryPurchasesAsync(
        QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),
        (billingResult, purchasesList) -> {
          JSArray resultArray = new JSArray();
          for (Purchase purchase : purchasesList) {
            JSObject item = new JSObject();
            item.put("orderId", purchase.getOrderId());
            item.put("packageName", purchase.getPackageName());
            item.put("productId", purchase.getProducts().isEmpty() ? null : purchase.getProducts().get(0));
            item.put("purchaseTime", purchase.getPurchaseTime());
            item.put("purchaseState", purchase.getPurchaseState());
            item.put("purchaseToken", purchase.getPurchaseToken());
            item.put("quantity", purchase.getQuantity());
            item.put("autoRenewing", purchase.isAutoRenewing());
            item.put("acknowledged", purchase.isAcknowledged());
            resultArray.put(item);
          }
          JSObject result = new JSObject();
          result.put("subscriptions", resultArray);
          call.resolve(result);
        });
    });
  }
  // Get Products
  @PluginMethod
  public void getProducts(PluginCall call) {
    Log.d(LOG_TAG, "getProducts called " + call);
    String type = call.getString("type");
    JSArray ids = call.getArray("productIds");
    if (type == null || ids == null) {
      call.reject("type or productIds missing");
      return;
    }
    List<QueryProductDetailsParams.Product> products = new ArrayList<>();
    for (int i = 0; i < ids.length(); i++) {
      String id = ids.optString(i);
      products.add(QueryProductDetailsParams.Product.newBuilder()
        .setProductId(id)
        .setProductType(type.equals("subs") ? BillingClient.ProductType.SUBS : BillingClient.ProductType.INAPP)
        .build());
    }
    ensureBillingClientReady(() -> {
      billingClient.queryProductDetailsAsync(
        QueryProductDetailsParams.newBuilder().setProductList(products).build(),
        (billingResult, productDetailsResult) -> {
          JSArray resultArray = new JSArray();
          if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
            List<ProductDetails> productDetailsList = productDetailsResult.getProductDetailsList();
            if (productDetailsList != null) {
              for (ProductDetails pd : productDetailsList) {
                JSObject item = new JSObject();
                item.put("productId", pd.getProductId());
                item.put("title", pd.getTitle());
                item.put("name", pd.getName());
                item.put("description", pd.getDescription());
                item.put("productType", pd.getProductType());
                if (pd.getSubscriptionOfferDetails() != null && !pd.getSubscriptionOfferDetails().isEmpty()) {
                  ProductDetails.SubscriptionOfferDetails offer = pd.getSubscriptionOfferDetails().get(0);
                  ProductDetails.PricingPhase pricingPhase = offer.getPricingPhases().getPricingPhaseList().get(0);
                  item.put("basePlanId", offer.getBasePlanId());
                  item.put("price", pricingPhase.getFormattedPrice());
                  item.put("priceAmountMicros", pricingPhase.getPriceAmountMicros());
                  item.put("priceCurrencyCode", pricingPhase.getPriceCurrencyCode());
                  item.put("billingPeriod", pricingPhase.getBillingPeriod());
                  item.put("recurrenceMode", pricingPhase.getRecurrenceMode());
                }
                resultArray.put(item);
              }
            }
          }
          JSObject result = new JSObject();
          result.put("products", resultArray);
          call.resolve(result);
        });
    });
  }
  // Purchase
  @PluginMethod
  public void purchase(PluginCall call) {
    String productId = call.getString("productId");
    String type = call.getString("type");
    if (productId == null || type == null) {
      call.reject("Missing productId or type");
      return;
    }
    pendingCall = call;
    List<QueryProductDetailsParams.Product> products = new ArrayList<>();
    products.add(QueryProductDetailsParams.Product.newBuilder()
      .setProductId(productId)
      .setProductType(type.equals("subs") ? BillingClient.ProductType.SUBS : BillingClient.ProductType.INAPP)
      .build());
    ensureBillingClientReady(() -> {
      billingClient.queryProductDetailsAsync(
        QueryProductDetailsParams.newBuilder().setProductList(products).build(),
        (billingResult, productDetailsResult) -> {
          if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            rejectPending("Billing unavailable: " + billingResult.getDebugMessage());
            notifyListeners("purchaseFailed", createErrorObject("Billing unavailable"));
            return;
          }
          List<ProductDetails> productDetailsList = productDetailsResult.getProductDetailsList();
          if (productDetailsList == null || productDetailsList.isEmpty()) {
            rejectPending("Product not found");
            notifyListeners("purchaseFailed", createErrorObject("Product not found"));
            return;
          }
          ProductDetails productDetails = productDetailsList.get(0);
          BillingFlowParams.ProductDetailsParams.Builder paramsBuilder = BillingFlowParams.ProductDetailsParams
            .newBuilder()
            .setProductDetails(productDetails);
          if ("subs".equals(type) && productDetails.getSubscriptionOfferDetails() != null
            && !productDetails.getSubscriptionOfferDetails().isEmpty()) {
            ProductDetails.SubscriptionOfferDetails offer = productDetails.getSubscriptionOfferDetails().get(0);
            paramsBuilder.setOfferToken(offer.getOfferToken());
          }
          BillingFlowParams billingFlowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(Collections.singletonList(paramsBuilder.build()))
            .build();
          Activity activity = getActivity();
          if (activity == null) {
            rejectPending("Activity is not available to launch billing flow");
            notifyListeners("purchaseFailed", createErrorObject("Activity is null"));
            return;
          }
          activity.runOnUiThread(() -> {
            try {
              BillingResult launchResult = billingClient.launchBillingFlow(activity, billingFlowParams);
              if (launchResult != null && launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                rejectPending("Failed to launch billing flow: " + launchResult.getDebugMessage());
                notifyListeners("purchaseFailed", createErrorObject(launchResult.getDebugMessage()));
              }
            } catch (Exception e) {
              Log.e(LOG_TAG, "Exception launching billing flow", e);
              rejectPending("Exception launching billing flow: " + e.getMessage());
              notifyListeners("purchaseFailed", createErrorObject(e.getMessage()));
            }
          });
        });
    });
  }
  @Override
  public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
    Log.d(LOG_TAG, "onPurchasesUpdated");
    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
      for (Purchase purchase : purchases) {
        if (!purchase.isAcknowledged()) {
          AcknowledgePurchaseParams acknowledgeParams = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.getPurchaseToken())
            .build();
          billingClient.acknowledgePurchase(acknowledgeParams, result -> {
            JSObject ackResult = new JSObject();
            ackResult.put("purchaseToken", purchase.getPurchaseToken());
            notifyListeners("purchaseAcknowledged", ackResult);
          });
        }
        JSObject result = getPurchaseJSObject(purchase);
        notifyListeners("purchaseCompleted", result);
        if (pendingCall != null) {
          pendingCall.resolve(result);
          pendingCall = null;
        }
      }
    } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
      rejectPending("User canceled the purchase.");
      notifyListeners("purchaseFailed", createErrorObject("User canceled"));
    } else {
      rejectPending("Purchase failed: " + billingResult.getDebugMessage());
      JSObject errorResult = new JSObject();
      errorResult.put("error", billingResult.getDebugMessage());
      notifyListeners("purchaseFailed", errorResult);
    }
  }
  private JSObject getPurchaseJSObject(Purchase purchase) {
    JSObject obj = new JSObject();
    obj.put("productId", purchase.getProducts().isEmpty() ? null : purchase.getProducts().get(0));
    obj.put("purchaseToken", purchase.getPurchaseToken());
    obj.put("purchaseTime", purchase.getPurchaseTime());
    obj.put("isAcknowledged", purchase.isAcknowledged());
    obj.put("isAutoRenewing", purchase.isAutoRenewing());
    return obj;
  }
  private JSObject createErrorObject(String message) {
    JSObject error = new JSObject();
    error.put("message", message);
    return error;
  }
  private void rejectPending(String message) {
    if (pendingCall != null) {
      pendingCall.reject(message);
      pendingCall = null;
    }
  }
}
