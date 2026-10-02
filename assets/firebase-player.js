import firebaseConfig from "./firebase-config.js";

const SDK_VERSION = "12.19.0";
const SDK_ROOT = "https://www.gstatic.com/firebasejs/" + SDK_VERSION + "/";
const GUEST_KEY = "rl2_guest_profile_v1";
const DEFAULT_PLAYER = Object.freeze({
  profile: { username: "Player1", level: 1, xp: 0, currency: 0 },
  equipped: { body: "octane_chassis", wheels: "dieci_oem", boost: "standard_blue" },
  inventory: ["octane_chassis", "dominus_chassis", "dieci_oem", "gold_wheels", "standard_blue", "alpha_boost"],
  stats: { wins: 0, goals: 0, heatseeker_high_score: 0 },
});

const isConfigured = config => Boolean(config?.apiKey && config?.authDomain && config?.projectId && config?.appId);
const copy = value => structuredClone(value);
const objectOrEmpty = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const mergePlayer = (base, incoming, uid) => {
  const data = objectOrEmpty(incoming);
  return {
    uid,
    profile: { ...DEFAULT_PLAYER.profile, ...objectOrEmpty(base?.profile), ...objectOrEmpty(data.profile) },
    equipped: { ...DEFAULT_PLAYER.equipped, ...objectOrEmpty(base?.equipped), ...objectOrEmpty(data.equipped) },
    inventory: [...new Set([...(base?.inventory || DEFAULT_PLAYER.inventory), ...(Array.isArray(data.inventory) ? data.inventory : [])])],
    stats: { ...DEFAULT_PLAYER.stats, ...objectOrEmpty(base?.stats), ...objectOrEmpty(data.stats) },
  };
};

/** Firebase Auth + Cloud Firestore player profiles with a persistent local guest fallback. */
export class FirebasePlayerAuth {
  constructor(config = firebaseConfig) {
    this.config = config;
    this.app = null;
    this.auth = null;
    this.db = null;
    this.sdk = null;
    this.user = null;
    this.progress = null;
    this.localOnly = !isConfigured(config);
    this.listeners = new Set();
    this.ready = false;
    this.anonRequested = false;
  }

  async initialize() {
    if (this.ready) return this.snapshot();
    if (!isConfigured(this.config)) {
      this.useLocalGuest();
      return this.snapshot();
    }
    try {
      const [appSdk, authSdk, storeSdk] = await Promise.all([
        import(SDK_ROOT + "firebase-app.js"),
        import(SDK_ROOT + "firebase-auth.js"),
        import(SDK_ROOT + "firebase-firestore.js"),
      ]);
      this.sdk = { ...appSdk, ...authSdk, ...storeSdk };
      this.app = this.sdk.initializeApp(this.config);
      this.auth = this.sdk.getAuth(this.app);
      this.db = this.sdk.getFirestore(this.app);
      await this.sdk.setPersistence(this.auth, this.sdk.browserLocalPersistence);
      this.sdk.onAuthStateChanged(this.auth, user => {
        if (user) void this.acceptFirebaseUser(user);
        else if (!this.anonRequested) {
          this.anonRequested = true;
          void this.sdk.signInAnonymously(this.auth).catch(error => this.useLocalGuest(error));
        }
      });
      this.ready = true;
      if (!this.auth.currentUser && !this.anonRequested) {
        this.anonRequested = true;
        await this.sdk.signInAnonymously(this.auth);
      }
      return this.snapshot();
    } catch (error) {
      this.useLocalGuest(error);
      return this.snapshot();
    }
  }

  useLocalGuest(error = null) {
    this.localOnly = true;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(GUEST_KEY) || "null"); } catch {}
    const uid = saved?.uid || ("guest-" + crypto.randomUUID());
    this.user = { uid, displayName: saved?.profile?.username || "Player1", email: null, isAnonymous: true, localOnly: true };
    this.progress = mergePlayer(DEFAULT_PLAYER, saved, uid);
    this.ready = true;
    this.persistGuest();
    this.publish(error ? "guest-fallback" : "guest");
  }

  async acceptFirebaseUser(user) {
    try {
      const ref = this.sdk.doc(this.db, "users", user.uid);
      const snapshot = await this.sdk.getDoc(ref);
      const existing = snapshot.exists() ? snapshot.data() : {};
      this.progress = mergePlayer(existing, {}, user.uid);
      if (!snapshot.exists()) await this.sdk.setDoc(ref, this.progress);
      this.user = user;
      this.localOnly = false;
      this.ready = true;
      this.publish("authenticated");
    } catch (error) {
      this.useLocalGuest(error);
    }
  }

  snapshot() {
    return { user: this.user, progress: this.progress ? copy(this.progress) : null, localOnly: this.localOnly };
  }

  onAuthStateChanged(callback) {
    this.listeners.add(callback);
    if (this.ready) queueMicrotask(() => callback(this.snapshot()));
    return () => this.listeners.delete(callback);
  }

  publish(status = "updated") {
    const state = { ...this.snapshot(), status };
    for (const callback of this.listeners) callback(state);
    window.dispatchEvent(new CustomEvent("rl2:player-state", { detail: state }));
  }

  persistGuest() {
    if (!this.localOnly || !this.user || !this.progress) return;
    try { localStorage.setItem(GUEST_KEY, JSON.stringify(this.progress)); } catch {}
  }

  requireFirebase() {
    if (!this.auth || !this.sdk) throw new Error("Add the Firebase web app config in assets/firebase-config.js and enable the requested sign-in providers.");
  }

  async signUp(email, password, username = "Player1") {
    this.requireFirebase();
    const current = this.auth.currentUser;
    let result;
    if (current?.isAnonymous) {
      const credential = this.sdk.EmailAuthProvider.credential(email, password);
      result = await this.sdk.linkWithCredential(current, credential);
    } else {
      result = await this.sdk.createUserWithEmailAndPassword(this.auth, email, password);
    }
    await this.savePlayerProgress(result.user.uid, { profile: { username } });
    return result.user;
  }

  async logIn(email, password) {
    this.requireFirebase();
    const result = await this.sdk.signInWithEmailAndPassword(this.auth, email, password);
    return result.user;
  }

  async signInWithGoogle() {
    this.requireFirebase();
    const provider = new this.sdk.GoogleAuthProvider();
    const current = this.auth.currentUser;
    const result = current?.isAnonymous
      ? await this.sdk.linkWithPopup(current, provider)
      : await this.sdk.signInWithPopup(this.auth, provider);
    return result.user;
  }

  async signInAnonymously() {
    if (!isConfigured(this.config)) {
      this.useLocalGuest();
      return this.user;
    }
    this.requireFirebase();
    const result = await this.sdk.signInAnonymously(this.auth);
    return result.user;
  }

  async logOut() {
    if (this.auth) await this.sdk.signOut(this.auth);
    this.useLocalGuest();
  }

  async savePlayerProgress(uid, data) {
    if (!uid || (this.user?.uid && uid !== this.user.uid)) throw new Error("You can only save progress to the signed-in player's profile.");
    if (this.localOnly || !this.db) {
      this.progress = mergePlayer(this.progress || DEFAULT_PLAYER, data, uid);
      this.persistGuest();
      this.publish("saved-local");
      return copy(this.progress);
    }
    const ref = this.sdk.doc(this.db, "users", uid);
    await this.sdk.runTransaction(this.db, async transaction => {
      const snapshot = await transaction.get(ref);
      const merged = mergePlayer(snapshot.exists() ? snapshot.data() : DEFAULT_PLAYER, data, uid);
      transaction.set(ref, merged);
    });
    const snapshot = await this.sdk.getDoc(ref);
    this.progress = mergePlayer(snapshot.data(), {}, uid);
    this.publish("saved-cloud");
    return copy(this.progress);
  }
}

export const playerAuth = new FirebasePlayerAuth();
window.RL2PlayerAuth = playerAuth;

function installProfileUI() {
  const appRoot = document.querySelector("#app");
  if (!appRoot || appRoot.querySelector("#profile-button")) return Boolean(appRoot);
  const settings = appRoot.querySelector("#settings-button");
  if (!settings?.parentElement) return false;

  const button = document.createElement("button");
  button.id = "profile-button";
  button.className = "hud-tool rl2-profile-tool";
  button.type = "button";
  button.textContent = "Guest";
  button.setAttribute("aria-label", "Player profile");
  settings.parentElement.insertBefore(button, settings);

  const panel = document.createElement("section");
  panel.id = "profile-panel";
  panel.className = "rl2-profile-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "profile-title");
  panel.innerHTML = '<div class="rl2-profile-card"><button class="rl2-profile-close" type="button" aria-label="Close profile">×</button><p class="rl2-profile-kicker">ROCKET LEAGUE 2</p><h2 id="profile-title">Player Profile</h2><p class="rl2-profile-state" role="status">Playing as a guest</p><form class="rl2-profile-form"><label>Username<input name="username" autocomplete="nickname" maxlength="24" value="Player1"></label><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="6" required></label><div class="rl2-profile-actions"><button type="button" data-auth-action="signup">Create account</button><button type="button" data-auth-action="login">Log in</button><button type="button" data-auth-action="google">Continue with Google</button><button type="button" data-auth-action="guest">Play as guest</button><button type="button" data-auth-action="logout" hidden>Sign out</button></div></form></div>';
  appRoot.appendChild(panel);
  button.addEventListener("click", () => { panel.hidden = !panel.hidden; });
  panel.querySelector(".rl2-profile-close").addEventListener("click", () => { panel.hidden = true; });
  panel.addEventListener("click", event => { if (event.target === panel) panel.hidden = true; });

  const form = panel.querySelector("form");
  const status = panel.querySelector(".rl2-profile-state");
  const update = state => {
    const progress = state.progress;
    const signedIn = Boolean(state.user && !state.user.isAnonymous && !state.localOnly);
    button.textContent = signedIn ? (progress?.profile?.username || state.user.displayName || "Player") : "Guest";
    status.textContent = state.localOnly ? "Guest profile · saved on this device" : signedIn ? "Signed in · progress syncs to your profile" : "Anonymous guest · progress syncs when online";
    panel.querySelector('[data-auth-action="logout"]').hidden = !signedIn;
    if (progress?.profile?.username) form.elements.username.value = progress.profile.username;
  };
  playerAuth.onAuthStateChanged(update);
  form.addEventListener("click", async event => {
    const action = event.target.closest("[data-auth-action]")?.dataset.authAction;
    if (!action) return;
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    const username = form.elements.username.value.trim() || "Player1";
    const setStatus = message => { status.textContent = message; };
    try {
      if (action === "signup") await playerAuth.signUp(email, password, username);
      else if (action === "login") await playerAuth.logIn(email, password);
      else if (action === "google") await playerAuth.signInWithGoogle();
      else if (action === "guest") await playerAuth.signInAnonymously();
      else if (action === "logout") await playerAuth.logOut();
      else return;
      update({ ...playerAuth.snapshot(), status: "updated" });
    } catch (error) {
      setStatus(error?.message || "Sign-in failed. Check your Firebase settings and try again.");
    }
  });
  return true;
}

const profileStyle = document.createElement("style");
profileStyle.textContent = '.rl2-profile-tool{min-width:62px;padding-inline:10px;font-size:12px;font-weight:800}.rl2-profile-panel{position:fixed;inset:0;z-index:1000001;display:grid;place-items:center;padding:20px;background:rgba(4,10,22,.78);backdrop-filter:blur(8px)}.rl2-profile-panel[hidden]{display:none}.rl2-profile-card{position:relative;width:min(460px,100%);max-height:min(90vh,720px);overflow:auto;padding:30px;border:1px solid #ffffff24;border-radius:22px;background:linear-gradient(145deg,#102543,#07111f);color:#f3f8ff;box-shadow:0 24px 90px #0009}.rl2-profile-close{position:absolute;right:16px;top:12px;border:0;background:none;color:inherit;font-size:28px;cursor:pointer}.rl2-profile-kicker{margin:0 0 8px;color:#61d8ff;font-size:11px;font-weight:900;letter-spacing:.18em}.rl2-profile-card h2{margin:0 0 8px;font-size:28px}.rl2-profile-state{min-height:1.4em;color:#b8c7da;font-size:13px}.rl2-profile-form{display:grid;gap:13px}.rl2-profile-form label{display:grid;gap:6px;color:#c4d3e4;font-size:13px}.rl2-profile-form input{width:100%;padding:11px 12px;border:1px solid #ffffff2b;border-radius:10px;background:#071625;color:#f3f8ff;font:inherit}.rl2-profile-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:5px}.rl2-profile-actions button{min-height:42px;padding:9px 12px;border:1px solid #48bfe566;border-radius:10px;background:#132b45;color:#f3f8ff;font:700 13px system-ui;cursor:pointer}.rl2-profile-actions button:first-child,.rl2-profile-actions button:nth-child(3){grid-column:1/-1;background:linear-gradient(110deg,#087ca7,#3454a0);border-color:#81dafa}.rl2-profile-actions button:hover{filter:brightness(1.18)}';
document.head.appendChild(profileStyle);

const mountObserver = new MutationObserver(() => { if (installProfileUI()) mountObserver.disconnect(); });
mountObserver.observe(document.documentElement, { childList: true, subtree: true });
void playerAuth.initialize();
