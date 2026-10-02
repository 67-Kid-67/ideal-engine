const THREE_ROOT = "https://cdn.jsdelivr.net/npm/three@0.180.0/";
const CAR_MODEL = "/assets/game-car/model.gltf";
const SLOT_NAMES = {
  body: "Body",
  wheels: "Wheels",
  boost: "Boost",
};
const ITEM_NAMES = {
  octane_chassis: "Octane Chassis",
  dominus_chassis: "Dominus Chassis",
  dieci_oem: "Dieci OEM",
  gold_wheels: "Gold Wheels",
  standard_blue: "Standard Blue",
  alpha_boost: "Alpha Boost",
};
const SLOT_ITEMS = {
  body: ["octane_chassis", "dominus_chassis"],
  wheels: ["dieci_oem", "gold_wheels"],
  boost: ["standard_blue", "alpha_boost"],
};
const ACCENTS = {
  octane_chassis: 0x168dff,
  dominus_chassis: 0xff7e39,
  dieci_oem: 0xaebbc9,
  gold_wheels: 0xf3c957,
  standard_blue: 0x38c9ff,
  alpha_boost: 0xffa52f,
};

const style = document.createElement("style");
style.textContent = `
.rl2-garage-button{font-weight:800}.rl2-garage-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:clamp(12px,3vw,32px);background:#050a13d9;backdrop-filter:blur(12px)}
.rl2-garage-overlay[hidden]{display:none}.rl2-garage-card{position:relative;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);width:min(1120px,100%);max-height:min(850px,94vh);overflow:hidden;border:1px solid #ffffff20;border-radius:24px;background:linear-gradient(135deg,#11233a,#07101d 70%);color:#eff7ff;box-shadow:0 30px 100px #000b;font:14px/1.45 system-ui,sans-serif}
.rl2-garage-stage{position:relative;min-height:430px;background:radial-gradient(ellipse at 50% 66%,#367caf55,transparent 52%),linear-gradient(155deg,#142c46,#0a1422)}.rl2-garage-canvas{position:absolute;inset:0;width:100%;height:100%}.rl2-garage-stage-label{position:absolute;left:26px;top:22px;color:#9cb6ce;font-size:11px;font-weight:900;letter-spacing:.18em}.rl2-garage-status{position:absolute;left:26px;bottom:22px;color:#c1d1e2;font-size:12px}.rl2-garage-content{overflow:auto;padding:clamp(22px,3vw,36px)}.rl2-garage-close{position:absolute;top:15px;right:16px;z-index:2;border:0;background:transparent;color:white;font-size:30px;cursor:pointer}.rl2-garage-content h2{margin:0;font-size:30px}.rl2-garage-subtitle{margin:7px 0 24px;color:#9eb0c5}.rl2-garage-slots{display:grid;gap:18px}.rl2-garage-slot h3{margin:0 0 9px;font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#84d9ff}.rl2-garage-items{display:flex;flex-wrap:wrap;gap:8px}.rl2-garage-item{padding:9px 11px;border:1px solid #ffffff20;border-radius:10px;background:#ffffff09;color:#eaf4ff;font:700 12px system-ui;cursor:pointer}.rl2-garage-item[aria-pressed=true]{border-color:#5bd8ff;background:#16618a77;box-shadow:0 0 0 1px #5bd8ff55 inset}.rl2-garage-item:disabled{opacity:.35;cursor:not-allowed}.rl2-garage-equip{width:100%;margin-top:24px;padding:13px;border:1px solid #85e3ff;border-radius:12px;background:linear-gradient(110deg,#087ca7,#3454a0);color:white;font:800 14px system-ui;cursor:pointer}.rl2-garage-equip:disabled{opacity:.55;cursor:wait}
@media(max-width:760px){.rl2-garage-card{grid-template-columns:1fr;grid-template-rows:minmax(260px,38vh) auto;max-height:96vh}.rl2-garage-stage{min-height:260px}.rl2-garage-content{padding:22px}.rl2-garage-content h2{font-size:25px}}
`;
document.head.append(style);

function installGarage() {
  const app = document.querySelector("#app");
  const profile = app?.querySelector("#profile-button");
  if (!profile || app.querySelector("#garage-button")) return Boolean(profile);

  const button = document.createElement("button");
  button.id = "garage-button";
  button.type = "button";
  button.className = "hud-tool rl2-garage-button";
  button.textContent = "Garage";
  button.setAttribute("aria-label", "Open garage");
  profile.parentElement.insertBefore(button, profile);

  const overlay = document.createElement("section");
  overlay.className = "rl2-garage-overlay";
  overlay.id = "garage-panel";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "garage-title");
  overlay.innerHTML = `<div class="rl2-garage-card"><button type="button" class="rl2-garage-close" aria-label="Close garage">×</button><div class="rl2-garage-stage"><canvas class="rl2-garage-canvas"></canvas><span class="rl2-garage-stage-label">RL2 · STUDIO PREVIEW</span><span class="rl2-garage-status" role="status">Loading your garage…</span></div><div class="rl2-garage-content"><h2 id="garage-title">Garage</h2><p class="rl2-garage-subtitle">Choose an owned item, preview it, then equip it.</p><div class="rl2-garage-slots"></div><button class="rl2-garage-equip" type="button">Equip selection</button></div></div>`;
  document.body.append(overlay);

  let state = null;
  let selected = null;
  let renderer = null;
  let THREE = null;
  let scene = null;
  let camera = null;
  let car = null;
  let animationRunning = false;
  let resizeObserver = null;
  const status = overlay.querySelector(".rl2-garage-status");
  const slots = overlay.querySelector(".rl2-garage-slots");
  const equip = overlay.querySelector(".rl2-garage-equip");

  function paintCar() {
    if (!car || !state?.progress) return;
    const equipped = { ...state.progress.equipped, ...selected };
    car.traverse(node => {
      if (!node.isMesh) return;
      const name = node.name.toLowerCase();
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const mat of mats) {
        if (mat?.userData?.rl2BaseColor) mat.color.copy(mat.userData.rl2BaseColor);
        if (mat?.userData?.rl2BaseEmissive) mat.emissive.copy(mat.userData.rl2BaseEmissive);
      }
      const itemId = name.includes("wheel") || name.includes("tire")
        ? equipped.wheels
        : name.includes("boost") || name.includes("outlet")
          ? equipped.boost
          : name.includes("body") ? equipped.body : null;
      if (!itemId || !ACCENTS[itemId]) return;
      const color = new THREE.Color(ACCENTS[itemId]);
      for (const mat of mats) {
        if (!mat?.color) continue;
        if (name.includes("boost") || name.includes("outlet")) {
          mat.emissive?.copy(color);
          if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = .8;
        } else if (name.includes("wheel") || name.includes("tire")) mat.color.copy(color);
        else if (name.includes("body")) mat.color.lerp(color, .16);
        mat.needsUpdate = true;
      }
    });
  }

  function renderSlots() {
    if (!state?.progress) return;
    const inventory = Array.isArray(state.progress.inventory) ? state.progress.inventory : [];
    const equipped = state.progress.equipped || {};
    slots.replaceChildren();
    for (const [slot, title] of Object.entries(SLOT_NAMES)) {
      const section = document.createElement("section");
      section.className = "rl2-garage-slot";
      const heading = document.createElement("h3");
      heading.textContent = title;
      const list = document.createElement("div");
      list.className = "rl2-garage-items";
      const candidates = SLOT_ITEMS[slot].filter(id => id === equipped[slot] || inventory.includes(id));
      for (const id of candidates) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "rl2-garage-item";
        item.textContent = ITEM_NAMES[id] || id;
        item.setAttribute("aria-pressed", String((selected[slot] || equipped[slot]) === id));
        item.addEventListener("click", () => {
          if (!inventory.includes(id) && id !== equipped[slot]) return;
          selected = { ...selected, [slot]: id };
          renderSlots();
          paintCar();
        });
        list.append(item);
      }
      section.append(heading, list);
      slots.append(section);
    }
  }

  async function initScene() {
    if (renderer) return;
    try {
      const [threeModule, loaderModule] = await Promise.all([
        import(THREE_ROOT + "build/three.module.js"),
        import(THREE_ROOT + "examples/jsm/loaders/GLTFLoader.js"),
      ]);
      THREE = threeModule;
      renderer = new THREE.WebGLRenderer({ canvas: overlay.querySelector("canvas"), alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      renderer.setSize(800, 520, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(34, 800 / 520, .1, 100);
      camera.position.set(4.5, 2.8, 6.2);
      camera.lookAt(0, .35, 0);
      scene.add(new THREE.HemisphereLight(0xd6eeff, 0x172338, 2.15));
      const key = new THREE.DirectionalLight(0xffffff, 3.1);
      key.position.set(3, 6, 4);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x58cfff, 2.2);
      rim.position.set(-4, 2, -3);
      scene.add(rim);
      const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.7, .18, 64), new THREE.MeshStandardMaterial({ color: 0x182b40, metalness: .48, roughness: .38 }));
      platform.position.y = -.19;
      scene.add(platform);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.48, .018, 8, 96), new THREE.MeshBasicMaterial({ color: 0x40cfff }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -.08;
      scene.add(ring);
      const loader = new loaderModule.GLTFLoader();
      loader.load(CAR_MODEL, gltf => {
        car = gltf.scene;
        car.traverse(node => {
          if (!node.isMesh) return;
          if (Array.isArray(node.material)) node.material = node.material.map(mat => mat.clone());
          else node.material = node.material.clone();
          for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
            mat.userData.rl2BaseColor = mat.color?.clone();
            mat.userData.rl2BaseEmissive = mat.emissive?.clone();
          }
        });
        car.scale.setScalar(1.55);
        car.position.y = -.06;
        scene.add(car);
        paintCar();
        status.textContent = "Preview ready · owned items only";
        startAnimation();
      }, undefined, () => { status.textContent = "Car preview could not load; equipped items can still be saved."; startAnimation(); });
      resizeObserver = new ResizeObserver(() => {
        const box = overlay.querySelector(".rl2-garage-stage").getBoundingClientRect();
        if (!box.width || !box.height) return;
        renderer.setSize(box.width, box.height, false);
        camera.aspect = box.width / box.height;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      });
      resizeObserver.observe(overlay.querySelector(".rl2-garage-stage"));
    } catch (error) {
      status.textContent = "3D preview unavailable here; item selection and saving remain available.";
      console.warn("Garage preview failed to initialize", error);
    }
  }

  function startAnimation() {
    if (!animationRunning && renderer && !overlay.hidden) {
      animationRunning = true;
      requestAnimationFrame(animate);
    }
  }

  function animate() {
    if (!renderer || !overlay.isConnected || overlay.hidden) { animationRunning = false; return; }
    if (car) car.rotation.y += .0018;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  function close() { overlay.hidden = true; }
  button.addEventListener("click", async () => {
    overlay.hidden = false;
    startAnimation();
    await window.RL2PlayerAuth?.initialize();
    state = window.RL2PlayerAuth?.snapshot();
    if (!state?.progress) { status.textContent = "Player profile is still loading. Try again in a moment."; return; }
    selected = { ...state.progress.equipped };
    renderSlots();
    await initScene();
    paintCar();
  });
  overlay.querySelector(".rl2-garage-close").addEventListener("click", close);
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !overlay.hidden) close(); });
  equip.addEventListener("click", async () => {
    const auth = window.RL2PlayerAuth;
    state = auth?.snapshot();
    if (!state?.user || !state?.progress) { status.textContent = "Sign in or continue as a guest before equipping items."; return; }
    const inventory = state.progress.inventory || [];
    for (const [slot, item] of Object.entries(selected || {})) {
      if (item !== state.progress.equipped[slot] && !inventory.includes(item)) {
        status.textContent = "That item is not in your inventory.";
        return;
      }
    }
    equip.disabled = true;
    const next = { ...state.progress.equipped, ...selected };
    try {
      await auth.savePlayerProgress(state.user.uid, { equipped: next });
      state = auth.snapshot();
      status.textContent = state.localOnly ? "Equipped and saved on this device." : "Equipped and synced to your profile.";
    } catch (error) {
      status.textContent = error?.message || "Could not save equipment. Try again.";
    } finally { equip.disabled = false; }
  });

  window.RL2Garage = { open: () => button.click(), close };
  return true;
}

const observer = new MutationObserver(() => { if (installGarage()) observer.disconnect(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
installGarage();
