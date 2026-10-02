const initialState = {
  cash: 12500,
  day: 1,
  nextId: 2,
  settings: { vibration: true, reducedMotion: false },
  garage: [
    { id: 1, name: "Fusquinha", kind: "Compacto", year: 1984, value: 4800, color: "#e75d43", mileage: "142 mil km", condition: "Bem cuidado", shape: "classic" },
  ],
  market: [
    { id: "market-1", name: "Pingo", kind: "Compacto", year: 1996, value: 6200, color: "#38a59a", mileage: "98 mil km", condition: "Bom estado", shape: "round" },
    { id: "market-2", name: "Trovão", kind: "Esportivo", year: 2003, value: 9700, color: "#eab73b", mileage: "76 mil km", condition: "Pintura nova", shape: "sport" },
    { id: "market-3", name: "Perua Rita", kind: "Utilitário", year: 1991, value: 8400, color: "#6985bd", mileage: "121 mil km", condition: "Motor revisado", shape: "wagon" },
  ],
  auction: [
    { id: "lot-1", bid: 3200, increment: 300, car: { id: "auction-car-1", name: "Ligeirinho", kind: "Compacto", year: 1988, value: 5600, color: "#d95a48", mileage: "105 mil km", condition: "Precisa de carinho", shape: "classic" } },
    { id: "lot-2", bid: 6800, increment: 500, car: { id: "auction-car-2", name: "Verde-limão", kind: "Esportivo", year: 2001, value: 9200, color: "#89b84a", mileage: "83 mil km", condition: "Bem conservado", shape: "sport" } },
  ],
};

const storageKey = "garagem-do-zeca-v2";
const legacyStorageKey = "garagem-do-zeca-v1";
const stage = document.querySelector("#game-stage");
const cashValue = document.querySelector("#cash-value");
const toast = document.querySelector("#toast");
let state = loadState();
let activeView = "map";
let toastTimer;
let mapController;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey));
    if (saved && Number.isFinite(saved.cash) && Array.isArray(saved.garage) && Array.isArray(saved.market)) {
      return { ...structuredClone(initialState), ...saved, settings: { ...initialState.settings, ...saved.settings }, auction: Array.isArray(saved.auction) ? saved.auction : structuredClone(initialState.auction) };
    }
  } catch { /* Dados antigos ou indisponiveis iniciam um novo jogo. */ }
  return structuredClone(initialState);
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function money(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function carArt(car) {
  const bodies = {
    classic: "M20 64 L28 44 Q31 38 43 37 L58 19 Q61 16 68 16 L99 16 Q105 16 110 23 L127 40 L145 44 Q151 46 154 55 L156 67 L151 72 L25 72 L19 68 Z",
    round: "M18 62 L26 45 Q29 39 42 38 L56 24 Q61 19 70 19 L101 19 Q108 19 114 26 L130 40 L147 44 Q153 46 155 55 L157 67 L150 72 L24 72 L18 68 Z",
    sport: "M17 63 L29 48 L57 42 L81 24 Q85 21 95 21 L118 24 L139 42 L151 46 Q156 48 158 57 L157 69 L149 73 L24 73 L17 68 Z",
    wagon: "M17 62 L25 43 Q28 38 40 37 L56 20 Q60 17 69 17 L118 17 Q125 17 130 24 L141 40 L151 44 Q156 46 158 56 L157 69 L149 73 L24 73 L17 68 Z",
  };
  const body = bodies[car.shape] || bodies.round;
  const windows = car.shape === "sport"
    ? '<path d="M61 40 L83 26 L95 26 L99 40 Z"/><path d="M104 27 L117 29 L132 40 L104 40 Z"/>'
    : '<path d="M62 39 L73 23 L96 23 L100 39 Z"/><path d="M105 23 L116 25 L130 39 L105 39 Z"/>';
  return `<svg viewBox="0 0 176 96" role="img" aria-label="Desenho do carro ${car.name}"><ellipse cx="88" cy="78" rx="69" ry="5" fill="#27322f" opacity=".18"/><path d="${body}" fill="${car.color}" stroke="#202724" stroke-width="3.5" stroke-linejoin="round"/><g fill="#b9e1dc" stroke="#202724" stroke-width="2.5" stroke-linejoin="round">${windows}</g><path d="M102 22 L102 43" stroke="#202724" stroke-width="2.5"/><path d="M22 55 L31 54" stroke="#fff0a8" stroke-width="4" stroke-linecap="round"/><path d="M145 54 L152 56" stroke="#e85b46" stroke-width="4" stroke-linecap="round"/><path d="M30 65 L145 65" stroke="#202724" stroke-width="2"/><g fill="#303632" stroke="#202724" stroke-width="2.5"><circle cx="48" cy="69" r="12"/><circle cx="128" cy="69" r="12"/></g><g fill="#e9e6d7" stroke="#202724" stroke-width="2"><circle cx="48" cy="69" r="5"/><circle cx="128" cy="69" r="5"/></g></svg>`;
}

function carCard(car, mode) {
  const isMarket = mode === "market";
  const disabled = isMarket && state.cash < car.value;
  const action = isMarket
    ? `<button class="buy-button" data-action="buy" data-id="${car.id}" ${disabled ? "disabled" : ""}>${disabled ? "Sem grana" : "Comprar"}</button>`
    : `<button class="sell-button" data-action="sell" data-id="${car.id}">Vender</button>`;
  return `<article class="car-card ${isMarket ? "market-card" : ""}">${isMarket ? '<span class="stock-tag">ACHADO DO DIA</span>' : ""}<div class="car-art">${carArt(car)}</div><div class="car-info"><span class="car-kind">${car.kind}</span><h3>${car.name}</h3><span class="car-year">Ano ${car.year}</span><div class="car-stats"><span>◉ ${car.mileage}</span></div><div class="car-price-row"><span class="car-price">${money(car.value)}</span>${action}</div></div></article>`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function buyCar(id) {
  const car = state.market.find((item) => item.id === id);
  if (!car || state.cash < car.value) return;
  state.cash -= car.value;
  state.garage.push({ ...car, id: state.nextId++ });
  state.market = state.market.filter((item) => item.id !== id);
  state.day += 1;
  saveState();
  render();
  vibrate();
  showToast(`${car.name} agora é seu. Boa compra!`);
}

function sellCar(id) {
  const carIndex = state.garage.findIndex((item) => item.id === Number(id));
  if (carIndex < 0) return;
  const [car] = state.garage.splice(carIndex, 1);
  const saleValue = Math.round(car.value * 1.18 / 100) * 100;
  state.cash += saleValue;
  state.day += 1;
  saveState();
  render();
  vibrate();
  showToast(`${car.name} vendido por ${money(saleValue)}!`);
}

function vibrate() {
  if (state.settings.vibration && "vibrate" in navigator) navigator.vibrate(18);
}

function sectionHeading(label, title, description) {
  return `<div class="section-heading"><div><span class="tiny-label">${label}</span><h1>${title}</h1><p>${description}</p></div></div>`;
}

function renderMap() {
  mapController?.destroy();
  stage.innerHTML = `<section class="map-screen" aria-label="Mapa da cidade">
    <div class="map-hud"><div><span class="map-kicker">DIA ${state.day} · BAIRRO DO ASFALTO</span><h1>O que vamos fazer hoje?</h1></div><span class="weather-badge">☀ 24°</span></div>
    <div class="map-viewport" id="map-viewport" aria-label="Mapa interativo. Arraste para explorar a cidade.">
      <div class="map-world" id="map-world">
        <svg class="town-map" viewBox="0 0 1000 900" role="img" aria-label="Cidade isométrica com garagem, loja e casa de leilões">
          <defs>
            <pattern id="grass" width="42" height="42" patternUnits="userSpaceOnUse"><circle cx="7" cy="9" r="1.5" fill="#80a85c" opacity=".55"/><circle cx="30" cy="27" r="1.2" fill="#80a85c" opacity=".38"/></pattern>
            <pattern id="roadDots" width="34" height="34" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="1.4" fill="#faf1cc" opacity=".22"/></pattern>
          </defs>
          <rect width="1000" height="900" fill="#acd18b"/><rect width="1000" height="900" fill="url(#grass)"/>
          <path d="M-100 263 1010 738M-82 616 785-85M328 972 1010 580" fill="none" stroke="#4a514b" stroke-width="106" stroke-linecap="round"/>
          <path d="M-100 263 1010 738M-82 616 785-85M328 972 1010 580" fill="none" stroke="#777c73" stroke-width="94" stroke-linecap="round"/>
          <path d="M-100 263 1010 738M-82 616 785-85M328 972 1010 580" fill="none" stroke="url(#roadDots)" stroke-width="90"/>
          <path d="M-100 263 1010 738M-82 616 785-85M328 972 1010 580" fill="none" stroke="#e9d894" stroke-width="3" stroke-dasharray="22 25" opacity=".9"/>
          <g fill="#e2cf9b" stroke="#4b5148" stroke-width="3" opacity=".9"><path d="m66 98 108-60 108 60-108 60z"/><path d="m725 85 89-50 89 50-89 50z"/><path d="m791 792 105-58 105 58-105 58z"/><path d="m82 754 88-49 88 49-88 49z"/></g>
          <g aria-hidden="true"><ellipse cx="198" cy="450" rx="126" ry="70" fill="#668f53"/><path d="m75 426 123-70 124 70-124 73z" fill="#a5ca75" stroke="#465747" stroke-width="4"/><path d="m75 426 123 73v34L75 462z" fill="#80a45f"/><path d="m322 426-124 73v34l124-71z" fill="#719555"/><path d="M128 414v-42l69-40 72 42v41l-72 42z" fill="#d2a46c" stroke="#414b43" stroke-width="4"/><path d="m119 372 78-47 82 48-78 47z" fill="#cf6249" stroke="#414b43" stroke-width="4"/><path d="m128 414 69 40v-75l-69-39z" fill="#e6c982"/><path d="m197 454 72-39v-76l-72 40z" fill="#bf8858"/><path d="M166 410v-27l20-12v27zM219 413v-27l20-12v27z" fill="#8ec8c0" stroke="#414b43" stroke-width="3"/><path d="M189 447v-42l19-11v42z" fill="#725445" stroke="#414b43" stroke-width="3"/></g>
          <g aria-hidden="true"><ellipse cx="734" cy="402" rx="136" ry="80" fill="#668f53"/><path d="m607 372 126-73 127 73-127 74z" fill="#a6cd7a" stroke="#465747" stroke-width="4"/><path d="m607 372 126 74v34l-126-74z" fill="#80a45f"/><path d="m860 372-127 74v34l127-74z" fill="#719555"/><path d="M660 363v-54l73-43 75 44v54l-75 44z" fill="#e3ce8d" stroke="#414b43" stroke-width="4"/><path d="m648 311 85-51 88 52-85 51z" fill="#3e8d7a" stroke="#414b43" stroke-width="4"/><path d="m660 363 73 44v-91l-73-43z" fill="#f0dca1"/><path d="m733 407 75-44v-91l-75 44z" fill="#c5a86d"/><path d="M681 352v-33l23-14v33zM739 357v-35l24-14v35z" fill="#92c8bc" stroke="#414b43" stroke-width="3"/><path d="M710 386v-40l19-12v41z" fill="#835845" stroke="#414b43" stroke-width="3"/></g>
          <g aria-hidden="true"><ellipse cx="468" cy="676" rx="124" ry="69" fill="#668f53"/><path d="m345 648 123-71 124 71-124 73z" fill="#a5ca75" stroke="#465747" stroke-width="4"/><path d="m345 648 123 73v34l-123-73z" fill="#80a45f"/><path d="m592 648-124 73v34l124-73z" fill="#719555"/><path d="M393 637v-45l75-44 77 45v44l-77 45z" fill="#e2a545" stroke="#414b43" stroke-width="4"/><path d="m380 593 88-52 91 53-89 53z" fill="#d45b46" stroke="#414b43" stroke-width="4"/><path d="m393 637 75 45v-76l-75-45z" fill="#efcc78"/><path d="m468 682 77-45v-76l-77 45z" fill="#c98a39"/><path d="M420 631v-30l24-14v30zM479 638v-31l24-14v31z" fill="#8ec8c0" stroke="#414b43" stroke-width="3"/><path d="M455 670v-41l20-12v41z" fill="#725445" stroke="#414b43" stroke-width="3"/></g>
          <g aria-hidden="true"><path d="M84 188c0-26 42-26 42 0v36H84z" fill="#397b55"/><path d="M70 193h70v26H70z" fill="#e7bf54" stroke="#435246" stroke-width="3"/><path d="M779 563c0-23 38-23 38 0v33h-38z" fill="#397b55"/><path d="M766 570h65v24h-65z" fill="#e7bf54" stroke="#435246" stroke-width="3"/><path d="M341 156c0-24 39-24 39 0v32h-39z" fill="#397b55"/><path d="M328 163h66v25h-66z" fill="#e7bf54" stroke="#435246" stroke-width="3"/><path d="M850 174c0-25 41-25 41 0v33h-41z" fill="#397b55"/><path d="M836 181h69v25h-69z" fill="#e7bf54" stroke="#435246" stroke-width="3"/></g>
          <g aria-hidden="true"><path d="m336 236 42-23 42 23-42 24z" fill="#518e65"/><path d="m336 236 42 24v38l-42-24z" fill="#3b7454"/><path d="m420 236-42 24v38l42-24z" fill="#2e654b"/><path d="m348 232 30-18 31 18-31 18z" fill="#d9bb68" stroke="#405247" stroke-width="3"/><path d="M682 716h65v21h-65z" fill="#b6c5ae" stroke="#405247" stroke-width="3"/><path d="M698 716v21m17-21v21m16-21v21" stroke="#405247" stroke-width="2"/><circle cx="273" cy="581" r="23" fill="#568a53"/><circle cx="273" cy="581" r="12" fill="#77a85f"/><circle cx="881" cy="302" r="25" fill="#568a53"/><circle cx="881" cy="302" r="13" fill="#77a85f"/></g>
          <g class="map-location" data-route="garage" role="button" tabindex="0" aria-label="Ir para sua garagem" transform="translate(197 332)"><ellipse class="location-shadow" cx="0" cy="0" rx="60" ry="15"/><path class="location-pin" d="M0-91c-28 0-49 21-49 48 0 35 49 83 49 83s49-48 49-83c0-27-21-48-49-48z"/><circle cx="0" cy="-45" r="28" fill="#fffcf1" stroke="#27332e" stroke-width="4"/><text x="0" y="-38" text-anchor="middle" class="pin-icon">$</text><rect class="map-label" x="-63" y="12" width="126" height="27" rx="4"/><text class="map-label-text" x="0" y="30" text-anchor="middle">SUA GARAGEM</text></g>
          <g class="map-location" data-route="auction" role="button" tabindex="0" aria-label="Ir para o leilão" transform="translate(733 246)"><ellipse class="location-shadow" cx="0" cy="0" rx="60" ry="15"/><path class="location-pin pin-auction" d="M0-91c-28 0-49 21-49 48 0 35 49 83 49 83s49-48 49-83c0-27-21-48-49-48z"/><circle cx="0" cy="-45" r="28" fill="#fffcf1" stroke="#27332e" stroke-width="4"/><text x="0" y="-37" text-anchor="middle" class="pin-icon">L</text><rect class="map-label" x="-63" y="12" width="126" height="27" rx="4"/><text class="map-label-text" x="0" y="30" text-anchor="middle">CASA DE LEILÃO</text></g>
          <g class="map-location" data-route="shop" role="button" tabindex="0" aria-label="Ir para a loja de carros" transform="translate(468 525)"><ellipse class="location-shadow" cx="0" cy="0" rx="60" ry="15"/><path class="location-pin pin-store" d="M0-91c-28 0-49 21-49 48 0 35 49 83 49 83s49-48 49-83c0-27-21-48-49-48z"/><circle cx="0" cy="-45" r="28" fill="#fffcf1" stroke="#27332e" stroke-width="4"/><text x="0" y="-37" text-anchor="middle" class="pin-icon">V</text><rect class="map-label" x="-63" y="12" width="126" height="27" rx="4"/><text class="map-label-text" x="0" y="30" text-anchor="middle">FEIRA DE CARROS</text></g>
          <g transform="translate(558 105) rotate(23)"><path d="M0 0h45v19H0z" fill="#f1d15c" stroke="#344238" stroke-width="3"/><path d="M8 19v20m29-20v20" stroke="#344238" stroke-width="3"/><text x="22" y="14" text-anchor="middle" font-size="10" font-weight="900" fill="#344238">CENTRO</text></g>
          <g transform="translate(105 863) rotate(-25)"><path d="M0 0h108v23H0z" fill="#fff8de" stroke="#344238" stroke-width="3"/><text x="54" y="16" text-anchor="middle" font-size="11" font-weight="900" fill="#344238">AV. DOS MOTORES</text></g>
        </svg>
      </div>
      <div class="map-controls"><button data-map-zoom="in" aria-label="Aproximar mapa">+</button><button data-map-zoom="out" aria-label="Afastar mapa">−</button><button data-map-home aria-label="Centralizar mapa">⌖</button></div>
      <div class="map-hint"><span>↔</span> Arraste o mapa para explorar</div>
    </div>
  </section>`;
  mapController = setupMap();
}

function renderShop() {
  const inventory = state.garage.length
    ? `<div class="inventory-strip"><span>NA SUA GARAGEM</span><b>${state.garage.length} ${state.garage.length === 1 ? "carro" : "carros"}</b><button data-view="garage">Ver coleção</button></div><div class="market-list">${state.market.map((car) => carCard(car, "market")).join("")}</div>`
    : `<div class="empty-state"><div><span aria-hidden="true">✳</span><h3>Todos vendidos!</h3><p>Não há carros disponíveis na loja hoje.</p></div></div>`;
  stage.innerHTML = `<section class="page-screen">${sectionHeading("CONCESSIONÁRIA DO BAIRRO", "Loja de carros", "Achados de hoje. Escolha com cabeça e negocie com o coração.")}${inventory}</section>`;
}

function renderGarage() {
  const cards = state.garage.length
    ? `<div class="garage-list">${state.garage.map((car) => carCard(car, "garage")).join("")}</div>`
    : `<div class="empty-state"><div><span aria-hidden="true">🚗</span><h3>Garagem vazia!</h3><p>Tem negócio bom esperando na loja ou no leilão.</p></div></div>`;
  stage.innerHTML = `<section class="page-screen">${sectionHeading("SUA COLEÇÃO · ${state.garage.length} VEÍCULOS", "Minha garagem", "Cuide dos seus carros ou venda para aumentar o caixa.")}${cards}</section>`;
}

function renderAuction() {
  const lots = state.auction.length ? `<div class="auction-list">${state.auction.map((lot, index) => {
    const nextBid = lot.bid + lot.increment;
    const disabled = state.cash < nextBid;
    return `<article class="auction-card"><div class="auction-lot"><span class="lot-number">LOTE ${String(index + 1).padStart(2, "0")}</span>${carArt(lot.car)}<span class="auction-condition">${lot.car.condition}</span></div><div class="auction-info"><span class="car-kind">${lot.car.kind} · ${lot.car.year}</span><h2>${lot.car.name}</h2><p>Valor estimado <b>${money(lot.car.value)}</b></p><div class="bid-current"><span>Lance atual</span><b>${money(lot.bid)}</b></div><button class="bid-button" data-action="bid" data-id="${lot.id}" ${disabled ? "disabled" : ""}>${disabled ? "Saldo insuficiente" : `Dar lance · ${money(nextBid)}`}</button></div></article>`;
  }).join("")}</div>` : `<div class="empty-state"><div><span aria-hidden="true">🔨</span><h3>Leilão encerrado</h3><p>Todos os lotes foram arrematados. Volte outro dia.</p></div></div>`;
  stage.innerHTML = `<section class="page-screen">${sectionHeading("PREGÃO ABERTO · DIA ${state.day}", "Casa de leilão", "Dê seu lance e leve o próximo achado para a garagem.")}${lots}<p class="market-tip"><span aria-hidden="true">!</span> O lance vencedor é descontado do caixa imediatamente.</p></section>`;
}

function renderSettings() {
  stage.innerHTML = `<section class="page-screen settings-screen">${sectionHeading("AJUSTES DO JOGO", "Configuração", "Deixe a cidade do seu jeito.")}<div class="settings-list"><label class="setting-row"><span><b>Vibração</b><small>Resposta tátil ao fechar um negócio</small></span><input type="checkbox" data-setting="vibration" ${state.settings.vibration ? "checked" : ""}><i class="switch" aria-hidden="true"></i></label><label class="setting-row"><span><b>Reduzir animações</b><small>Movimento mais discreto na interface</small></span><input type="checkbox" data-setting="reducedMotion" ${state.settings.reducedMotion ? "checked" : ""}><i class="switch" aria-hidden="true"></i></label></div><div class="settings-divider"></div><div class="reset-panel"><div><b>Começar do zero</b><p>Apaga sua coleção, seu caixa e todo o progresso salvo neste aparelho.</p></div><button class="reset-button" data-action="reset">Reiniciar jogo</button></div><p class="version-note">GARAGEM DO ZECA · VERSÃO 2.0</p></section>`;
  document.body.classList.toggle("reduce-motion", state.settings.reducedMotion);
}

function render() {
  cashValue.textContent = money(state.cash);
  document.querySelectorAll(".nav-item").forEach((item) => {
    const selected = item.dataset.view === activeView;
    item.classList.toggle("is-active", selected);
    item.setAttribute("aria-selected", String(selected));
  });
  if (activeView !== "map" && mapController) {
    mapController.destroy();
    mapController = null;
  }
  if (activeView === "map") renderMap();
  if (activeView === "shop") renderShop();
  if (activeView === "garage") renderGarage();
  if (activeView === "auction") renderAuction();
  if (activeView === "settings") renderSettings();
}

function setupMap() {
  const viewport = stage.querySelector("#map-viewport");
  const world = stage.querySelector("#map-world");
  if (!viewport || !world) return null;
  const worldSize = { width: 1000, height: 900 };
  const fitZoom = Math.min(.55, Math.max(.35, (viewport.clientWidth - 16) / 662));
  const camera = { x: 0, y: 0, zoom: fitZoom, pointer: null, dragged: false, suppressClick: false };
  const pointers = new Map();
  let pinch = null;
  const clamp = () => {
    const bounds = viewport.getBoundingClientRect();
    camera.x = Math.max(bounds.width - worldSize.width * camera.zoom, Math.min(0, camera.x));
    camera.y = Math.max(bounds.height - worldSize.height * camera.zoom, Math.min(0, camera.y));
  };
  const paint = () => { clamp(); world.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`; };
  const center = () => {
    const bounds = viewport.getBoundingClientRect();
    camera.x = bounds.width / 2 - 465 * camera.zoom;
    camera.y = (bounds.height - worldSize.height * camera.zoom) / 2;
    paint();
  };
  center();
  viewport.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".map-controls")) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    viewport.setPointerCapture(event.pointerId);
    if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      const midX = (first.x + second.x) / 2;
      const midY = (first.y + second.y) / 2;
      pinch = { distance: Math.hypot(first.x - second.x, first.y - second.y), zoom: camera.zoom, worldX: (midX - camera.x) / camera.zoom, worldY: (midY - camera.y) / camera.zoom };
      camera.dragged = true;
      return;
    }
    camera.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: camera.x, originY: camera.y };
    camera.dragged = false;
  });
  viewport.addEventListener("pointermove", (event) => {
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && pointers.size >= 2) {
      const [first, second] = [...pointers.values()];
      const distance = Math.max(1, Math.hypot(first.x - second.x, first.y - second.y));
      const midX = (first.x + second.x) / 2;
      const midY = (first.y + second.y) / 2;
      camera.zoom = Math.max(.35, Math.min(1.45, pinch.zoom * distance / pinch.distance));
      camera.x = midX - pinch.worldX * camera.zoom;
      camera.y = midY - pinch.worldY * camera.zoom;
      paint();
      return;
    }
    if (!camera.pointer || camera.pointer.id !== event.pointerId) return;
    const deltaX = event.clientX - camera.pointer.x;
    const deltaY = event.clientY - camera.pointer.y;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 5) camera.dragged = true;
    if (camera.dragged) {
      camera.x = camera.pointer.originX + deltaX;
      camera.y = camera.pointer.originY + deltaY;
      paint();
    }
  });
  const finishPointer = (event) => {
    pointers.delete(event.pointerId);
    if (pinch) {
      pinch = null;
      camera.pointer = null;
      camera.suppressClick = true;
      if (pointers.size === 1) {
        const [remainingId, remaining] = [...pointers.entries()][0];
        camera.pointer = { id: remainingId, x: remaining.x, y: remaining.y, originX: camera.x, originY: camera.y };
      }
      return;
    }
    if (!camera.pointer || camera.pointer.id !== event.pointerId) return;
    if (camera.dragged) {
      camera.suppressClick = true;
    }
    camera.pointer = null;
  };
  viewport.addEventListener("pointerup", finishPointer);
  viewport.addEventListener("pointercancel", finishPointer);
  viewport.addEventListener("click", (event) => {
    if (camera.suppressClick) {
      camera.suppressClick = false;
      return;
    }
    const location = event.target.closest("[data-route]");
    if (!location) return;
    goTo(location.dataset.route);
  });
  viewport.addEventListener("keydown", (event) => {
    const location = event.target.closest("[data-route]");
    if (location && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      goTo(location.dataset.route);
    }
  });
  viewport.querySelectorAll("[data-map-zoom]").forEach((button) => button.addEventListener("click", () => {
    const bounds = viewport.getBoundingClientRect();
    const oldZoom = camera.zoom;
    camera.zoom = Math.max(.35, Math.min(1.45, camera.zoom + (button.dataset.mapZoom === "in" ? .15 : -.15)));
    const ratio = camera.zoom / oldZoom;
    camera.x = bounds.width / 2 - (bounds.width / 2 - camera.x) * ratio;
    camera.y = bounds.height / 2 - (bounds.height / 2 - camera.y) * ratio;
    paint();
  }));
  viewport.querySelector("[data-map-home]").addEventListener("click", center);
  const resizeObserver = new ResizeObserver(() => {
    const bounds = viewport.getBoundingClientRect();
    camera.x = bounds.width / 2 - 465 * camera.zoom;
    camera.y = (bounds.height - worldSize.height * camera.zoom) / 2;
    paint();
  });
  resizeObserver.observe(viewport);
  return { center, destroy: () => resizeObserver.disconnect() };
}

function goTo(view) {
  activeView = view;
  render();
}

function bidOnLot(id) {
  const lotIndex = state.auction.findIndex((lot) => lot.id === id);
  if (lotIndex < 0) return;
  const lot = state.auction[lotIndex];
  const winningBid = lot.bid + lot.increment;
  if (state.cash < winningBid) return;
  state.auction.splice(lotIndex, 1);
  state.cash -= winningBid;
  state.garage.push({ ...lot.car, id: state.nextId++ });
  state.day += 1;
  saveState();
  render();
  vibrate();
  showToast(`${lot.car.name} arrematado por ${money(winningBid)}!`);
}

document.querySelector(".bottom-nav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  goTo(button.dataset.view);
});

document.querySelector("[data-home]").addEventListener("click", (event) => {
  event.preventDefault();
  goTo("map");
});

stage.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  if (button.dataset.action === "buy") buyCar(button.dataset.id);
  if (button.dataset.action === "sell") sellCar(button.dataset.id);
  if (button.dataset.action === "bid") bidOnLot(button.dataset.id);
  if (button.dataset.action === "reset" && window.confirm("Reiniciar o jogo? Todo o progresso salvo será apagado.")) {
    state = structuredClone(initialState);
    saveState();
    render();
    showToast("Jogo reiniciado. Um novo dia começa!");
  }
});

stage.addEventListener("change", (event) => {
  const input = event.target.closest("[data-setting]");
  if (!input) return;
  state.settings[input.dataset.setting] = input.checked;
  saveState();
  if (input.dataset.setting === "reducedMotion") document.body.classList.toggle("reduce-motion", input.checked);
  showToast("Configuração salva.");
});

render();