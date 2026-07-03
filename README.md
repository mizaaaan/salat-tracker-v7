# 🕌 Salat Tracker — iOS App

A beautiful Islamic prayer tracker built with **Expo (React Native)**.

## ✨ Features
- 🕰️ **Accurate Prayer Times** — Karachi method via GPS location
- 🧭 **Live Qibla Compass** — Real-time magnetometer needle pointing to Mecca
- 🔔 **Azan Alarms** — Local notifications for all 5 prayers
- 🔥 **Streak Tracking** — Daily streaks, longest streak, weekly calendar
- 🌙 **Beautiful Dark UI** — Gold & deep navy Islamic theme

---

## 📁 Project Structure
```
salat-tracker/
├── App.js                    ← Root navigation
├── app.json                  ← Expo config + iOS permissions
├── codemagic.yaml            ← Codemagic CI/CD build pipeline
├── eas.json                  ← EAS Build config
├── assets/                   ← ⚠️ Add your images here
└── src/
    ├── constants/colors.js
    ├── utils/
    │   ├── prayerTimes.js    ← adhan library wrapper
    │   ├── storage.js        ← AsyncStorage + streak logic
    │   └── notifications.js  ← Azan alarm scheduling
    └── screens/
        ├── HomeScreen.js     ← Prayer times + checkboxes
        ├── QiblaScreen.js    ← Live compass
        └── StreakScreen.js   ← Stats + weekly calendar
```

---

## 🖼️ Required Assets (add before building)

Place these files in the `/assets/` folder:

| File                   | Size        | Description         |
|------------------------|-------------|---------------------|
| `icon.png`             | 1024×1024   | App icon            |
| `splash.png`           | 1284×2778   | Launch screen       |
| `adaptive-icon.png`    | 1024×1024   | Android icon        |

> **Tip:** Use a black background (#0A0A1A) with a white mosque icon for a clean look.
> Free tool: [https://www.appicon.co](https://www.appicon.co)

---

## 🚀 Step 1 — Upload to GitHub

1. Create a new repository on GitHub (e.g., `salat-tracker`)
2. Open your iPhone terminal app (e.g., **a-Shell** or **iSH**)
3. Run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit — Salat Tracker"
   git remote add origin https://github.com/YOUR_USERNAME/salat-tracker.git
   git branch -M main
   git push -u origin main
   ```

---

## ⚙️ Step 2 — Set Up Codemagic

### Prerequisites
- ✅ **Apple Developer Account** ($99/year) — required to sign the IPA
- ✅ **Codemagic account** — [codemagic.io](https://codemagic.io) (free tier available)

### Setup Steps

1. **Log in to Codemagic** → Add your GitHub repo
2. Go to **Teams → Integrations → App Store Connect API**
3. Generate an API Key in [App Store Connect](https://appstoreconnect.apple.com/access/api)
4. Add these **environment variable groups** in Codemagic:

**Group: `app_store_connect`**
| Variable | Value |
|---|---|
| `APP_STORE_CONNECT_ISSUER_ID` | Your Issuer ID |
| `APP_STORE_CONNECT_KEY_IDENTIFIER` | Your Key ID |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Your `.p8` key contents |

**Group: `ios_signing`**
| Variable | Value |
|---|---|
| `CERTIFICATE_PRIVATE_KEY` | Your iOS Distribution certificate |

5. **Edit `codemagic.yaml`** — change `your@email.com` to your real email
6. **Trigger a build** — Codemagic will:
   - Run `expo prebuild` to generate the native iOS code
   - Install CocoaPods
   - Sign and build the IPA
   - Email you the IPA + upload to TestFlight

---

## 🛠️ Local Testing (optional)

If you have access to a computer:
```bash
npm install
npx expo start
```
Scan the QR code with **Expo Go** on your iPhone 11.

---

## 🕌 Prayer Calculation Method
This app uses the **Karachi method** (standard in Bangladesh, Pakistan, India).
To change it, edit `src/utils/prayerTimes.js`:
```js
// Change this line:
const params = CalculationMethod.Karachi();

// Other options:
// CalculationMethod.MuslimWorldLeague()
// CalculationMethod.MoonsightingCommittee()
// CalculationMethod.Egyptian()
// CalculationMethod.NorthAmerica()
```

---

## 📦 Key Libraries
| Library | Purpose |
|---|---|
| `adhan` | Prayer time + Qibla calculation |
| `expo-location` | GPS for prayer times |
| `expo-sensors` | Magnetometer for Qibla compass |
| `expo-notifications` | Azan alarm scheduling |
| `@react-native-async-storage` | Streak data persistence |
| `react-native-svg` | Compass UI drawing |

---

## 🤲 May Allah accept your prayers
