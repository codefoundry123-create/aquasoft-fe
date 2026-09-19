package com.waterreminderdailyfitness.app;

import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.view.View;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

import com.google.ads.mediation.admob.AdMobAdapter;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.LoadAdError;

import androidx.annotation.NonNull;

import com.waterreminderdailyfitness.app.ThreadUtil;

@CapacitorPlugin(name = "CollapsibleBannerAd")
public class CollapsibleBannerAd extends Plugin {

  private AdView adView;
  private static final String TAG = "CollapsibleBanner";

  @PluginMethod
  public void showCollapsibleBanner(PluginCall call) {
    ThreadUtil.runOnMain(() -> {
      String adUnitId = call.getString("adUnitId");
      String collapsiblePosition = call.getString("collapsiblePosition", "top"); // default "top"

      if (adUnitId == null || adUnitId.isEmpty()) {
        call.reject("adUnitId is required");
        return;
      }

      if (adView != null) {
        if (adView.getParent() != null) {
          ((ViewGroup) adView.getParent()).removeView(adView);
        }
        adView.destroy();
        adView = null;
      }

      adView = new AdView(getContext());
      adView.setAdUnitId(adUnitId);
      AdSize adSize = AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(getActivity(), AdSize.FULL_WIDTH);
      adView.setAdSize(adSize);

      // Collapsible config
      Bundle extras = new Bundle();
      extras.putString("collapsible", collapsiblePosition);

      AdRequest adRequest = new AdRequest.Builder()
        .addNetworkExtrasBundle(AdMobAdapter.class, extras)
        .build();

      // Layout placement
      FrameLayout layout = (FrameLayout) getActivity().findViewById(android.R.id.content);
      FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT
      );
      params.gravity = collapsiblePosition.equalsIgnoreCase("bottom") ? Gravity.BOTTOM : Gravity.TOP;

      // marginBottom
      final float scale = getContext().getResources().getDisplayMetrics().density;
      int marginBottomDp = call.getInt("marginBottom", 0);
      int bottomMarginPx = (int) (marginBottomDp * scale + 0.5f);
      params.setMargins(0, 0, 0, bottomMarginPx);

      layout.addView(adView, params);
      adView.loadAd(adRequest);

      adView.setAdListener(new AdListener() {
        @Override
        public void onAdLoaded() {
          JSObject result = new JSObject();
          result.put("status", "loaded");
          Log.d(TAG, "Collapsible Banner Loaded");
          notifyListeners("onBannerLoaded", result);
        }

        @Override
        public void onAdFailedToLoad(@NonNull LoadAdError adError) {
          JSObject error = new JSObject();
          error.put("status", "failed");
          error.put("errorCode", adError.getCode());
          error.put("message", adError.getMessage());
          notifyListeners("onBannerFailed", error);
          Log.d(TAG, "Banner Failed: " + error);
        }
      });

      call.resolve();
    });
  }

  @PluginMethod
  public void hideBanner(PluginCall call) {
    ThreadUtil.runOnMain(() -> {
      if (adView != null) {
        if (adView.getVisibility() == View.GONE) {
          JSObject result = new JSObject();
          result.put("status", "already_hidden");
          call.resolve(result);
          return;
        }

        adView.setVisibility(View.GONE);
        JSObject result = new JSObject();
        result.put("status", "hidden");
        notifyListeners("onBannerHidden", result);
        call.resolve(result);
      } else {
        call.reject("No banner to hide");
      }
    });
  }

  @PluginMethod
  public void showHiddenBanners(PluginCall call) {
    ThreadUtil.runOnMain(() -> {
      if (adView != null) {
        if (adView.getVisibility() == View.VISIBLE) {
          JSObject result = new JSObject();
          result.put("status", "already_shown");
          call.resolve(result);
          return;
        }

        adView.setVisibility(View.VISIBLE);
        JSObject result = new JSObject();
        result.put("status", "shown");
        notifyListeners("onBannerShown", result);
        call.resolve(result);
      } else {
        call.reject("No banner available to show");
      }
    });
  }

  @PluginMethod
  public void destroyCollapsibleBanner(PluginCall call) {
    ThreadUtil.runOnMain(() -> {
      if (adView != null) {
        if (adView.getParent() != null) {
          ((ViewGroup) adView.getParent()).removeView(adView);
        }
        adView.destroy();
        adView = null;

        JSObject result = new JSObject();
        result.put("status", "destroyed");
        notifyListeners("onBannerDestroyed", result);
        call.resolve(result);
      } else {
        call.reject("No collapsible banner to destroy");
      }
    });
  }

  @Override
  protected void handleOnDestroy() {
    ThreadUtil.runOnMain(() -> {
      if (adView != null) {
        if (adView.getParent() != null) {
          ((ViewGroup) adView.getParent()).removeView(adView);
        }
        adView.destroy();
        adView = null;
      }
    });
    super.handleOnDestroy();
  }
}
