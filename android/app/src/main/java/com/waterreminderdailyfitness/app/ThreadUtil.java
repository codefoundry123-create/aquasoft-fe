package com.waterreminderdailyfitness.app;

import android.os.Handler;
import android.os.Looper;

public class ThreadUtil {

  // Run code on Main (UI) Thread
  public static void runOnMain(Runnable runnable) {
    new Handler(Looper.getMainLooper()).post(runnable);
  }

  // Run code on Background Thread
  public static void runOnBackground(Runnable runnable) {
    new Thread(runnable).start();
  }
}
