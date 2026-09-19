package com.waterreminderdailyfitness.app;

import android.app.Activity;
import android.app.Application;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.lifecycle.DefaultLifecycleObserver;
import androidx.lifecycle.LifecycleOwner;
import androidx.lifecycle.ProcessLifecycleOwner;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.appopen.AppOpenAd;

@CapacitorPlugin(name = "AppOpenAd")
public class AppOpenAdPlugin extends Plugin
  implements Application.ActivityLifecycleCallbacks, DefaultLifecycleObserver {

  private static final String TAG = "AppOpenAdPlugin";

  private AppOpenAd appOpenAd;
  private String adUnitId;

  private boolean isAdShowing = false;
  private boolean isLoadingAd = false;
  private boolean isAdLoadCancelled = false;
  private boolean isWindowStable = false;

  private Activity currentActivity;
  private boolean lifecycleRegistered = false;

  /* -------------------------------------------------------------------------- */
  /*  Plugin lifecycle                                                           */
  /* -------------------------------------------------------------------------- */

  @Override
  public void load() {
    super.load();

    if (lifecycleRegistered) return;

    currentActivity = getActivity();
    getActivity().getApplication().registerActivityLifecycleCallbacks(this);
    ProcessLifecycleOwner.get().getLifecycle().addObserver(this);

    lifecycleRegistered = true;
  }

  /* -------------------------------------------------------------------------- */
  /*  Public API                                                                 */
  /* -------------------------------------------------------------------------- */

  @PluginMethod
  public void setAdUnitId(PluginCall call) {
    adUnitId = call.getString("adUnitId", null);

    if (adUnitId == null || adUnitId.isEmpty()) {
      call.reject("Ad unit id required");
      return;
    }
    call.resolve();
  }

  @PluginMethod
  public void loadAd(PluginCall call) {
    final String unitId = call != null
      ? call.getString("adUnitId", adUnitId)
      : adUnitId;

    if (unitId == null || unitId.isEmpty()) {
      if (call != null) call.reject("Ad unit id required");
      return;
    }

    if (isLoadingAd || appOpenAd != null || isAdShowing) {
      if (call != null) call.resolve();
      return;
    }

    Activity activity = currentActivity;
    if (activity == null || activity.isDestroyed()) {
      if (call != null) call.reject("Activity not ready");
      return;
    }

    isLoadingAd = true;
    isAdLoadCancelled = false;

    activity.runOnUiThread(() -> {
      AdRequest request = new AdRequest.Builder().build();

      AppOpenAd.load(
        getContext(),
        unitId,
        request,
        new AppOpenAd.AppOpenAdLoadCallback() {

          @Override
          public void onAdLoaded(@NonNull AppOpenAd ad) {
            if (isAdLoadCancelled) {
              isLoadingAd = false;
              return;
            }

            appOpenAd = ad;
            isLoadingAd = false;

            notifyListeners("adLoaded", new JSObject());
            if (call != null) call.resolve();
          }

          @Override
          public void onAdFailedToLoad(@NonNull com.google.android.gms.ads.LoadAdError error) {
            appOpenAd = null;
            isLoadingAd = false;

            JSObject ret = new JSObject();
            ret.put("error", error.getMessage());
            notifyListeners("adFailedToLoad", ret);

            if (call != null) call.reject(error.getMessage());
          }
        });
    });
  }

  @PluginMethod
  public void showAd(PluginCall call) {

    if (InterstitialAdHandle.getIsInterstitialEnabled()) {
      call.reject("INTERSTITIAL_ACTIVE");
      return;
    }

    if (isAdShowing || appOpenAd == null) {
      call.reject("AD_NOT_READY");
      return;
    }

    Activity activity = currentActivity;
    if (activity == null || activity.isFinishing() || activity.isDestroyed()) {
      call.reject("ACTIVITY_INVALID");
      return;
    }

    if (!isWindowStable) {
      call.reject("WINDOW_NOT_STABLE");
      return;
    }

    activity.runOnUiThread(() -> {
      try {
        appOpenAd.setFullScreenContentCallback(fullScreenCallback);
        appOpenAd.show(activity);
        call.resolve();
      } catch (Exception e) {
        call.reject("SHOW_FAILED");
      }
    });
  }

  @PluginMethod
  public void cancelAdRequest(PluginCall call) {
    isAdLoadCancelled = true;
    isLoadingAd = false;
    appOpenAd = null;

    notifyListeners("adLoadCancelled", new JSObject());
    call.resolve();
  }

  /* -------------------------------------------------------------------------- */
  /*  Ad callbacks                                                               */
  /* -------------------------------------------------------------------------- */

  private final FullScreenContentCallback fullScreenCallback =
    new FullScreenContentCallback() {

      @Override
      public void onAdShowedFullScreenContent() {
        isAdShowing = true;
        notifyListeners("adOpened", new JSObject());
      }

      @Override
      public void onAdDismissedFullScreenContent() {
        isAdShowing = false;
        appOpenAd = null;
        notifyListeners("adDismissed", new JSObject());
      }

      @Override
      public void onAdFailedToShowFullScreenContent(AdError error) {
        isAdShowing = false;
        appOpenAd = null;

        JSObject ret = new JSObject();
        ret.put("error", error.getMessage());
        notifyListeners("adFailedToShow", ret);
      }
    };

  /* -------------------------------------------------------------------------- */
  /*  Activity lifecycle                                                         */
  /* -------------------------------------------------------------------------- */

  @Override
  public void onActivityResumed(@NonNull Activity activity) {
    currentActivity = activity;

    // VERY IMPORTANT: delay until splash + surface are stable
    new Handler(Looper.getMainLooper()).postDelayed(() -> {
      if (!activity.isFinishing() && !activity.isDestroyed()) {
        isWindowStable = true;
      }
    }, 300);
  }

  @Override public void onActivityStarted(@NonNull Activity activity) { currentActivity = activity; }
  @Override public void onActivityCreated(@NonNull Activity a, Bundle b) {}
  @Override public void onActivityPaused(@NonNull Activity a) {}
  @Override public void onActivityStopped(@NonNull Activity a) {}
  @Override public void onActivitySaveInstanceState(@NonNull Activity a, @NonNull Bundle b) {}
  @Override public void onActivityDestroyed(@NonNull Activity a) {}

  /* -------------------------------------------------------------------------- */
  /*  Process lifecycle                                                          */
  /* -------------------------------------------------------------------------- */

  @Override
  public void onStop(@NonNull LifecycleOwner owner) {
    isWindowStable = false;
  }

  /* -------------------------------------------------------------------------- */
  /*  Cleanup                                                                    */
  /* -------------------------------------------------------------------------- */

  @Override
  protected void handleOnDestroy() {
    appOpenAd = null;
    isWindowStable = false;

    getActivity().getApplication().unregisterActivityLifecycleCallbacks(this);
    ProcessLifecycleOwner.get().getLifecycle().removeObserver(this);

    super.handleOnDestroy();
  }
}
