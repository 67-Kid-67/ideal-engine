# Firebase setup for Rocket League 2

The game can start without Firebase and keeps a guest profile on the current device. To enable cloud accounts:

1. Create a Firebase project and register a Web app in Firebase Console.
2. Copy that Web app's `apiKey`, `authDomain`, `projectId`, and `appId` into `assets/firebase-config.js`. These client values identify the Firebase project; they are not admin credentials.
3. In **Authentication → Sign-in method**, enable **Email/Password**, **Google**, and **Anonymous**. Anonymous sign-in lets a guest save progress and later link an email or Google account.
4. Create a **Cloud Firestore** database and publish the rules from `firestore.rules`.
5. Add `localhost` and the deployed Vercel hostname to **Authentication → Settings → Authorized domains**.
6. Serve the site over HTTP(S), reload it, and open **Profile** beside the Settings control. The first sign-in creates `users/{uid}` with the profile, equipped items, inventory, and stats document.

The browser uses Firebase's modular JavaScript SDK through the official Google-hosted ESM modules. Google popup sign-in requires the authorized domain and Google provider to be enabled. See the official [Firebase Web setup](https://firebase.google.com/docs/web/setup) and [Authentication for websites](https://firebase.google.com/docs/auth/web/start) guides.
