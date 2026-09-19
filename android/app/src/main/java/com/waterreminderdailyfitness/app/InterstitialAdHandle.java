package com.waterreminderdailyfitness.app;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "interstitialAd")
public class InterstitialAdHandle extends Plugin {

  private static final String LOG_TAG = "echo";
  public static boolean isInterstitialEnabled = false;

  @PluginMethod()
  public void interstitial(PluginCall interstitialAdEnable) {
    isInterstitialEnabled = interstitialAdEnable.getBoolean("interstitialAdShowed", false); // Default to false if not provided

    Log.e(LOG_TAG, "**interstitialAdShowed: " + isInterstitialEnabled);

    JSObject ret = new JSObject();
    ret.put("interstitialAdShowed", isInterstitialEnabled);
    getIsInterstitialEnabled();
    interstitialAdEnable.resolve(ret);
  }

  // Static getter method
  public static boolean getIsInterstitialEnabled() {
    Log.e(LOG_TAG, "**interstitialAdShowed: " + isInterstitialEnabled);
    return isInterstitialEnabled;
  }
}
