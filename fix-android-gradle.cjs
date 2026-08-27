const fs = require("fs");
const path = require("path");

// 1. Fix the build.gradle (jcenter -> mavenCentral)
const gradleFile = path.join(__dirname, "android", "capacitor-cordova-android-plugins", "build.gradle");
if (fs.existsSync(gradleFile)) {
    let c = fs.readFileSync(gradleFile, "utf8");
    c = c.replace(/jcenter\(\)/g, "mavenCentral()");
    if (!c.includes("namespace")) {
        c = c.replace(/android {/, "android {\n    namespace \"capacitor.cordova.android.plugins\"");
    }
    fs.writeFileSync(gradleFile, c, "utf8");
    console.log("✅ Fixed build.gradle");
}

// 2. Fix the AndroidManifest.xml (Remove the 'package=' attribute)
const manifestFile = path.join(__dirname, "android", "capacitor-cordova-android-plugins", "src", "main", "AndroidManifest.xml");
if (fs.existsSync(manifestFile)) {
    let m = fs.readFileSync(manifestFile, "utf8");
    // This regex looks for package="any.text" and removes it
    m = m.replace(/package="[^"]*"/, ""); 
    fs.writeFileSync(manifestFile, m, "utf8");
    console.log("✅ Cleaned AndroidManifest.xml");
} else {
    console.error("❌ Manifest not found at: " + manifestFile);
}
