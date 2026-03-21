package com.malvin.agent;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
// 1. Import the Google Auth Plugin
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Initializes the Bridge
    this.init(savedInstanceState, new ArrayList<Class<? extends Plugin>>() {{
      // 2. Add the GoogleAuth class here
      add(GoogleAuth.class);
    }});
  }
}