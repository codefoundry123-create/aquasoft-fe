package com.waterreminderdailyfitness.app;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "OpenEmail")
public class OpenEmail extends Plugin {

  private static final String LOG_TAG = "OpenEmail";

  @PluginMethod
  public void openGmail(PluginCall call) {
    String email = call.getString("email");
    String subject = call.getString("subject");
    String body = call.getString("body");

    try {
      // Create Gmail intent
      Intent intent = new Intent(Intent.ACTION_SENDTO);
      intent.setData(Uri.parse("mailto:"));
      intent.putExtra(Intent.EXTRA_EMAIL, new String[]{email});
      intent.putExtra(Intent.EXTRA_SUBJECT, subject);
      intent.putExtra(Intent.EXTRA_TEXT, body);
      intent.setPackage("com.google.android.gm"); // Force Gmail app

      getActivity().startActivity(intent);
      Log.i(LOG_TAG, "Gmail intent launched successfully");
      call.resolve();
    } catch (Exception e) {
      Log.e(LOG_TAG, "Gmail not available, using fallback: " + e.getMessage());

      // Fallback to default mail app
      try {
        Intent fallback = new Intent(Intent.ACTION_SENDTO);
        fallback.setData(Uri.parse("mailto:" + email));
        fallback.putExtra(Intent.EXTRA_SUBJECT, subject);
        fallback.putExtra(Intent.EXTRA_TEXT, body);
        getActivity().startActivity(fallback);
        call.resolve();
      } catch (Exception ex) {
        Log.e(LOG_TAG, "No email app found: " + ex.getMessage());
        call.reject("No email app available");
      }
    }
  }
}
