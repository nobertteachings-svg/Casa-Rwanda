# Casa Mobile (Expo)

iOS + Android app for Casa Rwanda. Uses the same backend flows as WhatsApp.

## Quick start

```bash
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_URL
npm start
```

Scan the QR code with Expo Go, or press `i` / `a` for simulator.

## Login

1. Enter the WhatsApp number you used to sign up on Casa.
2. Receive a 6-digit code on WhatsApp.
3. Enter the code — you land in the same menu/search flows as WhatsApp.

## Production builds

See [Docs/MOBILE_APP.md](../Docs/MOBILE_APP.md) for Railway env vars, EAS builds, and App Store / Play Store submission.
