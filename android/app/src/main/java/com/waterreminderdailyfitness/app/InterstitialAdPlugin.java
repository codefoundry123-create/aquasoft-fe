package com.waterreminderdailyfitness.app;

import android.app.Activity;
import android.util.Log;
import androidx.annotation.NonNull;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
@CapacitorPlugin(name = "InterstitialAdPlugin")
public class InterstitialAdPlugin extends Plugin {
  private static final String TAG = "InterstitialAdPlugin";
  private InterstitialAd mInterstitialAd;
  private boolean isAdLoaded = false;
  @PluginMethod
  public void loadAd(PluginCall call) {
    String adId = call.getString("adId");
    Activity activity = getActivity();
    if (adId == null || adId.isEmpty()) {
      call.reject("adId is required");
      return;
    }
    activity.runOnUiThread(() -> {
      AdRequest adRequest = new AdRequest.Builder().build();
      InterstitialAd.load(
        activity,
        adId,
        adRequest,
        new InterstitialAdLoadCallback() {
          @Override
          public void onAdLoaded(@NonNull InterstitialAd interstitialAd) {
            Log.d(TAG, "Ad loaded successfully");
            mInterstitialAd = interstitialAd;
            isAdLoaded = true;
            notifyListeners("Loaded", new JSObject());
            call.resolve();
          }
          @Override
          public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
            Log.e(TAG, "Failed to load ad: " + loadAdError.getMessage());
            mInterstitialAd = null;
            isAdLoaded = false;
            JSObject ret = new JSObject();
            ret.put("message", loadAdError.getMessage());
            notifyListeners("FailedToLoad", ret);
            call.reject("Ad failed to load: " + loadAdError.getMessage());
          }
        });
    });
  }
  @PluginMethod
  public void showAd(PluginCall call) {
    Activity activity = getActivity();
    if (mInterstitialAd == null || !isAdLoaded) {
      Log.w(TAG, "Ad not loaded yet");
      call.reject("Ad not loaded");
      return;
    }
    activity.runOnUiThread(() -> {
      if (activity.isFinishing() || activity.isDestroyed()) {
        Log.e(TAG, "Activity is not ready to show ad");
        call.reject("Activity not ready");
        return;
      }
      mInterstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
        @Override
        public void onAdShowedFullScreenContent() {
          Log.d(TAG, "Ad showed full screen content");
          notifyListeners("Showed", new JSObject());
        }
        @Override
        public void onAdDismissedFullScreenContent() {
          Log.d(TAG, "Ad dismissed full screen content");
          mInterstitialAd = null;
          isAdLoaded = false;
          notifyListeners("Dismissed", new JSObject());
        }
        @Override
        public void onAdFailedToShowFullScreenContent(AdError adError) {
          Log.e(TAG, "Ad failed to show: " + adError.getMessage());
          mInterstitialAd = null;
          isAdLoaded = false;
          JSObject ret = new JSObject();
          ret.put("message", adError.getMessage());
          notifyListeners("FailedToShow", ret);
        }
      });
      try {
        // Post a short delay to ensure views are ready
        activity.getWindow().getDecorView().postDelayed(() -> {
          if (mInterstitialAd != null) {
            mInterstitialAd.show(activity);
            call.resolve();
          } else {
            call.reject("Ad not available to show");
          }
        }, 200); // 200ms delay
      } catch (Exception e) {
        Log.e(TAG, "Error showing ad: " + e.getMessage());
        call.reject("Error showing ad: " + e.getMessage());
      }
    });
  }
  @PluginMethod
  public void isAdLoaded(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("isLoaded", isAdLoaded);
    call.resolve(ret);
  }
}
