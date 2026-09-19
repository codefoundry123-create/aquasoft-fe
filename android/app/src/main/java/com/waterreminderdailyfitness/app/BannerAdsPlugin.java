package com.waterreminderdailyfitness.app;

import android.app.Activity;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.os.Bundle;

import androidx.annotation.NonNull;

import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.*;
import com.google.ads.mediation.admob.AdMobAdapter;
import com.google.android.gms.ads.*;

@CapacitorPlugin(name = "BannerAds")
public class BannerAdsPlugin extends Plugin {
  private static final String LOG_TAG = "BannerAdsPlugin";

  private AdView adView;
  private FrameLayout adContainer;

  @PluginMethod
  public void showBanner(PluginCall call) {
    String adId = call.getString("adId");
    String type = call.getString("type", "banner");
    String position = call.getString("position", "bottom");
    boolean collapsible = call.getBoolean("collapsible", false);
    int marginDp = call.getInt("margin", 0); // optional

    if (adId == null || adId.isEmpty()) {
      call.reject("Missing adId");
      return;
    }

    Activity activity = getActivity();
    activity.runOnUiThread(() -> {
      try {
        removeExistingBanner();

        adView = new AdView(activity);
        adView.setAdUnitId(adId);
        adView.setAdSize(getAdSize(activity, type));

        // Create container for the banner
        adContainer = new FrameLayout(activity);
        FrameLayout.LayoutParams containerParams = new FrameLayout.LayoutParams(
          FrameLayout.LayoutParams.MATCH_PARENT,
          FrameLayout.LayoutParams.WRAP_CONTENT
        );

        // Convert dp margin to px
        int marginPx = dpToPx(activity, marginDp);
        if (position.equalsIgnoreCase("top")) {
          containerParams.gravity = Gravity.TOP;
          containerParams.setMargins(0, marginPx, 0, 0);
        } else {
          containerParams.gravity = Gravity.BOTTOM;
          containerParams.setMargins(0, 0, 0, marginPx);
        }

        adContainer.setLayoutParams(containerParams);
        adContainer.addView(adView);

        // Add container to the root view properly (like Capacitor AdMob)
        FrameLayout rootView = (FrameLayout) activity.findViewById(android.R.id.content);
        rootView.addView(adContainer);

        AdRequest.Builder builder = new AdRequest.Builder();
        if (collapsible) {
          Bundle extras = new Bundle();
          extras.putString("collapsible", position.equals("top") ? "top" : "bottom");
          builder.addNetworkExtrasBundle(AdMobAdapter.class, extras);
        }

        adView.setAdListener(new AdListener() {
          @Override
          public void onAdLoaded() {
            Log.d(LOG_TAG, "onAdLoaded: " + adId);
            notifyListeners("onAdLoaded", null);
          }

          @Override
          public void onAdFailedToLoad(@NonNull LoadAdError adError) {
            JSObject err = new JSObject();
            err.put("message", adError.getMessage());
            Log.e(LOG_TAG, "onAdFailedToLoad: " + adError.getMessage());
            notifyListeners("onAdFailedToLoad", err);
          }

          @Override
          public void onAdOpened() {
            Log.d(LOG_TAG, "onAdOpened: " + adId);
            notifyListeners("onAdOpened", null);
          }

          @Override
          public void onAdClosed() {
            Log.d(LOG_TAG, "onAdClosed: " + adId);
            notifyListeners("onAdClosed", null);
          }
        });

        adView.loadAd(builder.build());
        call.resolve();

      } catch (Exception e) {
        Log.e(LOG_TAG, "Error showing banner: " + e.getMessage());
        call.reject("Error showing banner: " + e.getMessage());
      }
    });
  }

  private AdSize getAdSize(Activity activity, String type) {
    switch (type) {
      case "adaptive":
        return AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, getAdWidth(activity));
      case "inline":
        return AdSize.getCurrentOrientationInlineAdaptiveBannerAdSize(activity, getAdWidth(activity));
      case "large_banner":
        return AdSize.LARGE_BANNER;
      case "medium_rectangle":
        return AdSize.MEDIUM_RECTANGLE;
      case "full_banner":
        return AdSize.FULL_BANNER;
      case "leaderboard":
        return AdSize.LEADERBOARD;
      case "banner":
      default:
        return AdSize.BANNER;
    }
  }

  private int getAdWidth(Activity activity) {
    DisplayMetrics outMetrics = new DisplayMetrics();
    activity.getWindowManager().getDefaultDisplay().getMetrics(outMetrics);
    float density = outMetrics.density;
    int adWidthPixels = outMetrics.widthPixels;
    return (int) (adWidthPixels / density);
  }

  private int dpToPx(Activity activity, int dp) {
    float density = activity.getResources().getDisplayMetrics().density;
    return Math.round(dp * density);
  }

  private void removeExistingBanner() {
    if (adContainer != null) {
      View parent = (View) adContainer.getParent();
      if (parent instanceof FrameLayout) {
        ((FrameLayout) parent).removeView(adContainer);
      }
      adContainer.removeAllViews();
      adContainer = null;
    }
    if (adView != null) {
      adView.destroy();
      adView = null;
    }
  }

  @PluginMethod
  public void hideBanner(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      if (adView != null) adView.setVisibility(View.GONE);
      call.resolve();
    });
  }

  @PluginMethod
  public void resumeBanner(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      if (adView != null) {
        adView.resume();
        adView.setVisibility(View.VISIBLE);
      }
      call.resolve();
    });
  }

  @PluginMethod
  public void removeBanner(@NonNull PluginCall call) {
    getActivity().runOnUiThread(() -> removeExistingBanner());
    call.resolve();
  }
}
