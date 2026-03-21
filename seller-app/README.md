# Ecom Seller Android App

## Setup Instructions

### 1. Replace Placeholders in Constants.kt
Open: `app/src/main/java/com/ecom/seller/utils/Constants.kt`

```kotlin
const val BASE_URL = "https://YOUR_RAILWAY_URL.railway.app/api/"
const val SOCKET_URL = "https://YOUR_RAILWAY_URL.railway.app"
const val AGORA_APP_ID = "YOUR_AGORA_APP_ID"
```

Replace:
- `YOUR_RAILWAY_URL` → your actual Railway deployment URL
- `YOUR_AGORA_APP_ID` → your Agora App ID from console.agora.io

### 2. Add google-services.json
- Go to Firebase Console → your project → Add Android App
- Package name: `com.ecom.seller`
- Download `google-services.json`
- Place it in the `app/` folder (same level as app/build.gradle)

### 3. Open in Android Studio
- File → Open → select this `seller-app` folder
- Wait for Gradle sync to finish (~2-3 mins)

### 4. Run the App
- Connect Android phone via USB (enable Developer Mode)
- Click the ▶ Run button
- OR use AVD Manager to create an emulator

## Features
- Seller login & registration
- Go LIVE with camera broadcast (Agora RTC)
- Incoming call notifications (FCM + Socket.io)
- Split-screen video call with buyers
- Product management (add/delete)
- Order management (update status)

## Tech Stack
- Kotlin + Coroutines
- Retrofit2 + OkHttp
- Agora RTC SDK v4.x
- Firebase Cloud Messaging
- Socket.io Android Client
- Material Design 3
