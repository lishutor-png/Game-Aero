import fs from 'fs';
import path from 'path';

const root = process.cwd();

// 1. Enforce sensorLandscape on <activity> in AndroidManifest.xml
const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');
  if (!manifest.includes('android:screenOrientation')) {
    manifest = manifest.replace(/<activity(\s)/, '<activity android:screenOrientation="sensorLandscape"$1');
    fs.writeFileSync(manifestPath, manifest, 'utf8');
  }
}

// 2. Enable fullscreen in styles.xml
const stylesPath = path.join(root, 'android/app/src/main/res/values/styles.xml');
if (fs.existsSync(stylesPath)) {
  let styles = fs.readFileSync(stylesPath, 'utf8');
  if (!styles.includes('android:windowFullscreen')) {
    styles = styles.replace(
      /(<style[^>]*name="AppTheme\.NoActionBar"[^>]*>[\s\S]*?)(<\/style>)/,
      '$1    <item name="android:windowFullscreen">true</item>\n    $2',
    );
    fs.writeFileSync(stylesPath, styles, 'utf8');
  }
}

// 3. Configure edge-to-edge immersive sticky fullscreen in MainActivity.java
function findMainActivity(dir) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findMainActivity(full);
      if (found) return found;
    } else if (entry.name === 'MainActivity.java') {
      return full;
    }
  }
  return null;
}

const mainActivityPath = findMainActivity(path.join(root, 'android/app/src/main/java'));
if (mainActivityPath) {
  let java = fs.readFileSync(mainActivityPath, 'utf8');
  if (!java.includes('SYSTEM_UI_FLAG_IMMERSIVE_STICKY')) {
    const pkgMatch = java.match(/^package\s+[^;]+;/m);
    const pkgLine = pkgMatch ? pkgMatch[0] : 'package com.aeroglide3d.app;';
    java = `${pkgLine}

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    applyImmersiveFullscreen();
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) {
      applyImmersiveFullscreen();
    }
  }

  private void applyImmersiveFullscreen() {
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    getWindow().addFlags(
      WindowManager.LayoutParams.FLAG_FULLSCREEN | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
    );
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      WindowManager.LayoutParams lp = getWindow().getAttributes();
      lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
      getWindow().setAttributes(lp);
    }
    View decorView = getWindow().getDecorView();
    decorView.setSystemUiVisibility(
      View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        | View.SYSTEM_UI_FLAG_FULLSCREEN
    );
  }
}
`;
    fs.writeFileSync(mainActivityPath, java, 'utf8');
  }
}

// 4. Copy rebuilt AeroGlide app icon and remove adaptive xml override
const iconSrc = path.join(root, 'public/pwa-512x512.png');
const resDir = path.join(root, 'android/app/src/main/res');
if (fs.existsSync(iconSrc) && fs.existsSync(resDir)) {
  const anydpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  if (fs.existsSync(anydpiDir)) {
    fs.rmSync(anydpiDir, { recursive: true, force: true });
  }
  for (const entry of fs.readdirSync(resDir, { withFileTypes: true })) {
    if (entry.isDirectory() && /^mipmap-.*dpi$/.test(entry.name)) {
      const targetDir = path.join(resDir, entry.name);
      fs.copyFileSync(iconSrc, path.join(targetDir, 'ic_launcher.png'));
      fs.copyFileSync(iconSrc, path.join(targetDir, 'ic_launcher_round.png'));
    }
  }
}
