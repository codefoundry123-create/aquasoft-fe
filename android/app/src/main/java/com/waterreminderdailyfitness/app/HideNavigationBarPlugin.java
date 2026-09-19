package com.waterreminderdailyfitness.app;

import android.app.Activity;
import android.os.Build;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "HideNavigationBar")
public class HideNavigationBarPlugin extends Plugin {

  private static final String LOG_TAG = "HideNavigationBarPlugin";

  @PluginMethod
  public void hide(PluginCall call) {
    Activity activity = getActivity();

    if (activity == null) {
      call.reject("Activity is null");
      return;
    }

    activity.runOnUiThread(() -> {
      try {
        View decorView = activity.getWindow().getDecorView();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          // Android 11+ → hide ONLY navigation bar
          WindowInsetsController controller = activity.getWindow().getInsetsController();
          if (controller != null) {
            controller.hide(WindowInsets.Type.navigationBars());
            controller.setSystemBarsBehavior(
              WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
          }
        } else {
          // Android 10 and below → hide ONLY navigation bar
          int flags =
              View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;

          decorView.setSystemUiVisibility(flags);
        }

        call.resolve();
      } catch (Exception e) {
        Log.e(LOG_TAG, "Failed to hide navigation bar", e);
        call.reject("Failed to hide navigation bar: " + e.getMessage());
      }
    });
  }

  @PluginMethod
  public void show(PluginCall call) {
    Activity activity = getActivity();

    if (activity == null) {
      call.reject("Activity is null");
      return;
    }

    activity.runOnUiThread(() -> {
      try {
        View decorView = activity.getWindow().getDecorView();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          WindowInsetsController controller = activity.getWindow().getInsetsController();
          if (controller != null) {
            controller.show(WindowInsets.Type.navigationBars());
          }
        } else {
          decorView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
        }

        call.resolve();
      } catch (Exception e) {
        Log.e(LOG_TAG, "Failed to show navigation bar", e);
        call.reject("Failed to show navigation bar: " + e.getMessage());
      }
    });
  }
}
