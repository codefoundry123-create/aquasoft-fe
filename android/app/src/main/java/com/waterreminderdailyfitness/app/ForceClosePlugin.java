package com.waterreminderdailyfitness.app;

import android.app.Activity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
@CapacitorPlugin(name = "ForceClose")
public class ForceClosePlugin extends Plugin {

  @PluginMethod
  public void closeApp(PluginCall call) {
    Activity activity = getActivityFromPluginCall(call);
    if (activity != null) {
      activity.finishAffinity(); // Close all activities and exit
      System.exit(0);
      call.resolve();

    } else {
      call.reject("Unable to get Activity.");
    }
  }

  private Activity getActivityFromPluginCall(PluginCall call) {
    return getActivity(); // `getActivity()` is inherited from Plugin in Capacitor 5+
  }
}
