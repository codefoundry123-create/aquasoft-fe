package com.waterreminderdailyfitness.app;

import android.app.Activity;
import android.content.Context;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdLoader;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.nativead.MediaView;
import com.google.android.gms.ads.nativead.NativeAd;
import com.google.android.gms.ads.nativead.NativeAdView;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
@CapacitorPlugin(name = "NativeAd")
public class NativeAdPlugin extends Plugin {
  private FrameLayout rootView;
  private final Map<String, NativeAd> loadedAds = new HashMap<>();
  private final Map<String, NativeAdView> activeViews = new HashMap<>();
  private final Map<String, PluginCall> pendingRequests = new HashMap<>();
  // ----------------------------------------------------
  // Plugin lifecycle
  // ----------------------------------------------------
  @Override
  public void load() {
    super.load();
    Activity activity = getActivity();
    rootView = activity.findViewById(android.R.id.content);
    // REQUIRED: initialize once
    MobileAds.initialize(activity);
  }
  // ----------------------------------------------------
  // Utils
  // ----------------------------------------------------
  private int dp(Context ctx, int dp) {
    return Math.round(dp * ctx.getResources().getDisplayMetrics().density);
  }
  // ----------------------------------------------------
  // Load Native Ad (NO UI)
  // ----------------------------------------------------
  @PluginMethod
  public void loadNativeAd(PluginCall call) {
    String adUnitId = call.getString("adUnitId");
    if (adUnitId == null || adUnitId.isEmpty()) {
      call.reject("adUnitId is required");
      return;
    }
    String requestId = UUID.randomUUID().toString();
    pendingRequests.put(requestId, call);
    getActivity().runOnUiThread(() -> {
      AdLoader loader = new AdLoader.Builder(getContext(), adUnitId)
        .forNativeAd(ad -> {
          if (!pendingRequests.containsKey(requestId)) {
            ad.destroy();
            return;
          }
          String adId = UUID.randomUUID().toString();
          loadedAds.put(adId, ad);
          pendingRequests.remove(requestId);
          JSObject res = new JSObject();
          res.put("status", "loaded");
          res.put("adId", adId);
          call.resolve(res);
          notifyListeners("onAdLoaded", res);
        })
        .withAdListener(new AdListener() {
          @Override
          public void onAdFailedToLoad(LoadAdError error) {
            if (!pendingRequests.containsKey(requestId)) return;
            pendingRequests.remove(requestId);
            call.reject(error.getMessage());
            notifyListeners("onAdFailed",
              new JSObject().put("adUnitId", adUnitId));
          }
          @Override
          public void onAdClicked() {
            notifyListeners("onAdClicked",
              new JSObject().put("adUnitId", adUnitId));
          }
          @Override
          public void onAdImpression() {
            notifyListeners("onAdImpression",
              new JSObject().put("adUnitId", adUnitId));
          }
        })
        .build();
      loader.loadAd(new AdRequest.Builder().build());
    });
  }
  // ----------------------------------------------------
  // Show Native Ad
  // ----------------------------------------------------
  @PluginMethod
  public void showNativeAd(PluginCall call) {
    String adId = call.getString("adId");
    if (adId == null) {
      call.reject("adId required");
      return;
    }
    NativeAd ad = loadedAds.remove(adId);
    if (ad == null) {
      call.reject("Ad not loaded");
      return;
    }
    String layoutType = call.getString("layoutType", "medium");
    int x = call.getInt("x", 0);
    int y = call.getInt("y", 0);
    int width = call.getInt("width", ViewGroup.LayoutParams.MATCH_PARENT);
    int height = call.getInt("height", ViewGroup.LayoutParams.WRAP_CONTENT);
    getActivity().runOnUiThread(() -> {
      Context ctx = getContext();
      NativeAdView adView = new NativeAdView(ctx);
      View content = LayoutInflater.from(ctx)
        .inflate(getLayoutForType(layoutType), adView, false);
      adView.addView(content);
      bindNativeAd(ad, adView);
      FrameLayout.LayoutParams params =
        new FrameLayout.LayoutParams(
          width == ViewGroup.LayoutParams.MATCH_PARENT ? width : dp(ctx, width),
          height == ViewGroup.LayoutParams.WRAP_CONTENT ? height : dp(ctx, height)
        );
      params.leftMargin = dp(ctx, x);
      params.topMargin = dp(ctx, y);
      params.gravity = Gravity.TOP | Gravity.START;
      rootView.addView(adView, params);
      activeViews.put(adId, adView);
      JSObject res = new JSObject();
      res.put("status", "displayed");
      res.put("adId", adId);
      call.resolve(res);
    });
  }
  // ----------------------------------------------------
  // Hide Native Ad (no destroy)
  // ----------------------------------------------------
  @PluginMethod
  public void hideNativeAd(PluginCall call) {
    String adId = call.getString("adId");
    NativeAdView view = activeViews.get(adId);
    if (view == null) {
      call.reject("Ad not active");
      return;
    }
    getActivity().runOnUiThread(() -> {
      view.setVisibility(View.GONE);
      call.resolve(new JSObject().put("status", "hidden"));
    });
  }
  // ----------------------------------------------------
  // Resume Native Ad
  // ----------------------------------------------------
  @PluginMethod
  public void resumeNativeAd(PluginCall call) {
    String adId = call.getString("adId");
    NativeAdView view = activeViews.get(adId);
    if (view == null) {
      call.reject("Ad not active");
      return;
    }
    getActivity().runOnUiThread(() -> {
      view.setVisibility(View.VISIBLE);
      call.resolve(new JSObject().put("status", "resumed"));
    });
  }
  // ----------------------------------------------------
  // Remove Native Ad (DESTROY)
  // ----------------------------------------------------
  @PluginMethod
  public void removeNativeAd(PluginCall call) {
    String adId = call.getString("adId");
    NativeAdView view = activeViews.remove(adId);
    if (view == null) {
      call.reject("Ad not active");
      return;
    }
    getActivity().runOnUiThread(() -> {
      if (view.getParent() != null) rootView.removeView(view);
      try {
        NativeAd ad = (NativeAd) view.getTag();
        if (ad != null) ad.destroy();
        view.destroy();
      } catch (Exception ignored) {}
      call.resolve(new JSObject().put("status", "removed"));
    });
  }
  // ----------------------------------------------------
  // Cancel Load Request
  // ----------------------------------------------------
  @PluginMethod
  public void cancelNativeAdRequest(PluginCall call) {
    String requestId = call.getString("requestId");
    PluginCall pending = pendingRequests.remove(requestId);
    if (pending == null) {
      call.reject("No pending request");
      return;
    }
    pending.reject("Cancelled");
    call.resolve(new JSObject().put("status", "cancelled"));
  }
  // ----------------------------------------------------
  // Bind Native Ad
  // ----------------------------------------------------
  private void bindNativeAd(NativeAd ad, NativeAdView view) {
    TextView headline = view.findViewById(R.id.ad_headline);
    TextView body = view.findViewById(R.id.ad_body);
    Button cta = view.findViewById(R.id.ad_call_to_action);
    ImageView icon = view.findViewById(R.id.ad_app_icon);
    MediaView media = view.findViewById(R.id.ad_media);
    ImageView close = view.findViewById(R.id.ad_close);
    if (headline != null) {
      headline.setText(ad.getHeadline());
      view.setHeadlineView(headline);
    }
    if (body != null && ad.getBody() != null) {
      body.setText(ad.getBody());
      view.setBodyView(body);
    }
    if (cta != null && ad.getCallToAction() != null) {
      cta.setText(ad.getCallToAction());
      view.setCallToActionView(cta);
    }
    if (media != null && ad.getMediaContent() != null) {
      media.setMediaContent(ad.getMediaContent());
      view.setMediaView(media);
    }
    if (icon != null && ad.getIcon() != null) {
      icon.setImageDrawable(ad.getIcon().getDrawable());
      view.setIconView(icon);
    }
    if (close != null) {
      close.setOnClickListener(v ->
        notifyListeners("onNativeAdAction",
          new JSObject().put("action", "close_clicked")));
    }
    view.setTag(ad);
    view.setNativeAd(ad);
  }
  // ----------------------------------------------------
  // Layout resolver
  // ----------------------------------------------------
  private int getLayoutForType(String type) {
    switch (type) {
      case "small":
        return R.layout.native_ad_layout_small;
      case "exit_native_ad":
        return R.layout.exit_native_layout;
      case "welcome_medium_native":
        return R.layout.welcome_native_layout;
      case "intro_small":
        return R.layout.intro_small_native;
      case "intro_full":
        return R.layout.intro_full_native;
      case "lang_medium_native":
        return R.layout.lang_native_layout;
      case "home_medium_native":
        return R.layout.home_native_layout;
      case "history_medium_native":
        return R.layout.history_native_layout;
      case "reminder_medium_native":
        return R.layout.reminder_native_layout;
      case "setting_medium_native":
        return R.layout.setting_native_layout;
      case "user_form_medium_native":
        return R.layout.userform_native_layout;
      default:
        return R.layout.native_ad_layout;
    }
  }
  // ----------------------------------------------------
  // Cleanup
  // ----------------------------------------------------
  @Override
  protected void handleOnDestroy() {
    for (NativeAdView v : activeViews.values()) {
      try {
        if (v.getParent() != null) rootView.removeView(v);
        v.destroy();
      } catch (Exception ignored) {}
    }
    activeViews.clear();
    for (NativeAd ad : loadedAds.values()) {
      try { ad.destroy(); } catch (Exception ignored) {}
    }
    loadedAds.clear();
    pendingRequests.clear();
    super.handleOnDestroy();
  }
}
