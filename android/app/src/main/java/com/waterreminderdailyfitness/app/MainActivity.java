package com.waterreminderdailyfitness.app;

import com.getcapacitor.BridgeActivity;

import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;

import com.google.firebase.FirebaseApp;
import com.google.firebase.crashlytics.FirebaseCrashlytics;

import androidx.core.view.WindowCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import android.os.Bundle;


public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {

    // Register Plugin
    registerPlugin(InterstitialAdHandle.class); // Interstitial Ad listener called for App Open handle
    registerPlugin(ForceClosePlugin.class); // Force Close Application Ad Plugin
    registerPlugin(AppOpenAdPlugin.class); // App Open Ad Plugin
    registerPlugin(NativeAdPlugin.class); // Native Ad Plugin
    registerPlugin(SubscriptionManagerPlugin.class); // Subscription Plugin
    registerPlugin(HideNavigationBarPlugin.class); // HideNavigationBarPlugin Plugin
    registerPlugin(OpenEmail.class); //open Gmail for Feedback
    registerPlugin(CollapsibleBannerAd.class); //Collapsible Banner Ad
    registerPlugin(InterstitialAdPlugin.class); //Interstitial AD
    registerPlugin(BannerAdsPlugin.class); // Banner AD

    super.onCreate(savedInstanceState);

    // ✅ Firebase initialization
    FirebaseApp.initializeApp(this);
    FirebaseCrashlytics.getInstance().setCrashlyticsCollectionEnabled(true);

    // Enable edge-to-edge
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

    // Handle insets
    ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (v, insets) -> {
      // Adjust your UI here
      return WindowInsetsCompat.CONSUMED;
    });

    // ..For Custom App Open Ad..//
    MobileAds.initialize(this, new OnInitializationCompleteListener() {
      @Override
      public void onInitializationComplete(InitializationStatus initializationStatus) {
      }
    });
  }
}
