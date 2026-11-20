# Buddy - your AI study friend (Android app, no server)

Everything runs inside the app on your phone. The only outside call is to Google Gemini for the AI replies.

## One-time setup on your computer
1. Install **Node.js 20+** (nodejs.org)
2. Install **Android Studio** (developer.android.com/studio). Let it install the Android SDK and JDK 17+.
3. Get a free Gemini API key at **aistudio.google.com** (Get API key).

## Build the app
```
npm install
npm run sync        # builds the web part and copies it into the Android project
npm run open        # opens the project in Android Studio
```
In Android Studio: wait for Gradle to finish, then
- **Phone plugged in by USB** (USB debugging on): press the green Run button, or
- **Build > Build APK(s)**, then copy `app/build/outputs/apk/debug/app-debug.apk` to your phone and install it.

## First launch
Open the app > Settings > paste your Gemini API key and choose your voice language. Tap the mic and talk.

## Voice commands handled on the phone
- "Remember that my physics exam is on Friday"
- "Add task finish maths homework"
- "Start study timer" / "Stop the timer"

## Known limits (v1)
- The study timer only runs while the app is open.
- Android speech recognition needs internet on most phones, and needs the Google app / speech services installed.
- Your API key is stored inside the app on your phone. Do not share the APK with others.
