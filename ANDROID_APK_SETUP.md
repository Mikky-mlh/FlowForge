# FlowForge Android APK Setup

## ✅ What's Configured:

### PWA Features
- PNG icons (192x192, 512x512) in `public/`
- Service worker with offline caching
- Manifest with stable ID
- See: `public/manifest.json` and `vite.config.ts`

---

## 🚀 Build APK with PWABuilder:

1. **Deploy your app:**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

2. **Go to PWABuilder:**
   - Visit: https://www.pwabuilder.com/
   - Enter: https://flowforge-f5e99.web.app
   - Click "Start" → "Package For Stores" → "Android"
   - Generate and download APK

3. **Extract and install:**
   - Extract APK from ZIP file
   - Transfer to phone and install

---

## 🔄 Update Workflow:

```bash
npm run build
firebase deploy --only hosting
# Then regenerate APK on PWABuilder
```

---

## 📱 Key Files:

- `public/manifest.json` - PWA manifest with icons and ID
- `public/icon-192.png` & `icon-512.png` - App icons
- `vite.config.ts` - Service worker configuration
- `src/contexts/AuthContext.tsx` - Google authentication

---

## 📦 PWA Features:

- ✅ Offline support via service worker
- ✅ Installable on Android
- ✅ Google Sign-In works in TWA
- ✅ Background caching for Firebase, fonts, APIs
- ✅ Auto-updates when deployed

---

Your app is ready to build as APK via PWABuilder! 🚀
