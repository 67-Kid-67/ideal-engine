const style = document.createElement("style");
style.textContent = `
.credits-panel{max-width:760px;margin:0 auto}
.credits-panel__card{padding:clamp(18px,3vw,30px);border:1px solid #526b88;border-radius:5px;background:linear-gradient(135deg,#132238,#0c1727 72%);box-shadow:0 18px 50px #0004}
.credits-panel__eyebrow{margin:0 0 8px;color:#63c6f4;font-size:11px;font-weight:850;letter-spacing:.16em;text-transform:uppercase}
.credits-panel__title{margin:0 0 18px;color:#f4f7fc;font-size:clamp(24px,4vw,34px);font-weight:900;letter-spacing:-.025em}
.credits-panel__row{display:grid;grid-template-columns:minmax(130px,.55fr) 1fr;gap:12px;padding:13px 0;border-top:1px solid #ffffff1a}
.credits-panel__row strong{color:#afc2d9;font-size:12px;font-weight:750}
.credits-panel__row span,.credits-panel__row a{color:#eff5fd;font-size:13px;line-height:1.5}
.credits-panel__row a{color:#76d2ff;text-decoration:underline;text-underline-offset:3px}
@media(max-width:520px){.credits-panel__row{grid-template-columns:1fr;gap:4px}}
`;
document.head.append(style);

function addCredits() {
  const overlay = document.querySelector("#settings-overlay");
  const nav = overlay?.querySelector(".sheet-tabs");
  const body = overlay?.querySelector(".sheet-body");
  if (!nav || !body || nav.querySelector('[data-settings-tab="credits"]')) return Boolean(nav);

  const tab = document.createElement("button");
  tab.id = "settings-tab-credits";
  tab.className = "sheet-tab";
  tab.type = "button";
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-selected", "false");
  tab.setAttribute("aria-controls", "settings-panel-credits");
  tab.dataset.settingsTab = "credits";
  tab.innerHTML = '<span aria-hidden="true">✦</span><span class="sheet-tab__name">Credits</span>';

  const panel = document.createElement("section");
  panel.id = "settings-panel-credits";
  panel.className = "sheet-panel credits-panel";
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", tab.id);
  panel.setAttribute("tabindex", "0");
  panel.dataset.settingsPanel = "credits";
  panel.hidden = true;
  panel.innerHTML = `<div class="credits-panel__card">
    <p class="credits-panel__eyebrow">Rocket League</p>
    <h2 class="credits-panel__title">Credits</h2>
    <div class="credits-panel__row"><strong>Created by</strong><span>Jenil D</span></div>
    <div class="credits-panel__row"><strong>Game engine</strong><span>Three.js</span></div>
    <div class="credits-panel__row"><strong>Portal support</strong><span>Y8 SDK integration and ads are retained.</span></div>
    <div class="credits-panel__row"><strong>Third-party notices</strong><span>
      <a href="/licenses/rocketsim.txt" target="_blank" rel="noreferrer">RocketSim</a> ·
      <a href="/licenses/phosphor-icons.txt" target="_blank" rel="noreferrer">Phosphor Icons</a> ·
      <a href="/licenses/ice-rings.txt" target="_blank" rel="noreferrer">Ice Rings map</a> ·
      <a href="/licenses/dribble-challenge.txt" target="_blank" rel="noreferrer">Dribble Challenge</a>
    </span></div>
  </div>`;

  const nextHint = nav.querySelector('[data-el="hintNext"]');
  nextHint ? nav.insertBefore(tab, nextHint) : nav.append(tab);
  body.append(panel);
  tab.addEventListener("click", () => {
    overlay.querySelectorAll("[data-settings-tab]").forEach(item => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });
    overlay.querySelectorAll("[data-settings-panel]").forEach(item => { item.hidden = item !== panel; });
    panel.focus();
  });
  return true;
}

const observer = new MutationObserver(() => { if (addCredits()) observer.disconnect(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
addCredits();
