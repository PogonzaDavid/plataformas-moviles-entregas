const API_BASE = "https://ddragon.leagueoflegends.com";
const LOCALE = "es_ES";
const roleNames = {
  Fighter: "Luchador",
  Tank: "Tanque",
  Mage: "Mago",
  Assassin: "Asesino",
  Marksman: "Tirador",
  Support: "Apoyo",
};

const grid = document.querySelector("#champion-grid");
const statusMessage = document.querySelector("#status-message");
const searchInput = document.querySelector("#search-input");
const sortSelect = document.querySelector("#sort-select");
const countLabel = document.querySelector("#champion-count");
const versionLabel = document.querySelector("#version-label");
const modalBody = document.querySelector("#modal-body");
let champions = [];
let selectedRole = "all";
let modal;

function showStatus(message, isError = false) {
  statusMessage.classList.toggle("error-message", isError);
  statusMessage.innerHTML = isError
    ? `<span>${message}</span><button class="retry-button" type="button">Reintentar</button>`
    : `<span class="loading-spinner" aria-hidden="true"></span><span>${message}</span>`;
  statusMessage.classList.remove("d-none");
  grid.replaceChildren();
  statusMessage.querySelector(".retry-button")?.addEventListener("click", loadChampions);
}

function hideStatus() {
  statusMessage.classList.add("d-none");
}

async function loadChampions() {
  showStatus("Cargando campeones...");
  try {
    const versionResponse = await fetch(`${API_BASE}/api/versions.json`);
    if (!versionResponse.ok) throw new Error("No se pudo consultar la versión de Data Dragon.");
    const versions = await versionResponse.json();
    const version = versions[0];
    if (!version) throw new Error("La API no devolvió una versión disponible.");

    const response = await fetch(
      `${API_BASE}/cdn/${version}/data/${LOCALE}/champion.json`,
    );
    if (!response.ok) throw new Error("No se pudieron cargar los datos de campeones.");
    const payload = await response.json();
    champions = Object.values(payload.data);
    if (!champions.length) throw new Error("La API no devolvió campeones.");

    versionLabel.textContent = version;
    countLabel.textContent = champions.length;
    hideStatus();
    renderChampions();
  } catch (error) {
    console.error("Error al cargar los campeones:", error);
    showStatus("No fue posible cargar los campeones. Comprueba tu conexión e inténtalo de nuevo.", true);
  }
}

function getVisibleChampions() {
  const query = searchInput.value.trim().toLocaleLowerCase("es");
  return champions
    .filter((champion) => {
      const matchesName = champion.name.toLocaleLowerCase("es").includes(query)
        || champion.title.toLocaleLowerCase("es").includes(query);
      const matchesRole = selectedRole === "all" || champion.tags.includes(selectedRole);
      return matchesName && matchesRole;
    })
    .sort((a, b) => {
      if (sortSelect.value === "name-desc") return b.name.localeCompare(a.name, "es");
      if (sortSelect.value === "difficulty") {
        return b.info.difficulty - a.info.difficulty || a.name.localeCompare(b.name, "es");
      }
      return a.name.localeCompare(b.name, "es");
    });
}

function renderChampions() {
  const visibleChampions = getVisibleChampions();
  countLabel.textContent = selectedRole === "all" && !searchInput.value.trim()
    ? champions.length
    : `${visibleChampions.length}/${champions.length}`;

  if (!visibleChampions.length) {
    showStatus("No encontramos campeones con esos criterios.");
    statusMessage.querySelector(".loading-spinner")?.remove();
    return;
  }

  hideStatus();
  const cards = visibleChampions.map((champion) => {
    const column = document.createElement("div");
    column.className = "col";
    const card = document.createElement("button");
    card.type = "button";
    card.className = "champion-card";
    card.setAttribute("aria-label", `Ver detalles de ${champion.name}`);
    card.innerHTML = `
      <span class="card-art">
        <img src="${API_BASE}/cdn/${champion.version}/img/champion/${champion.image.full}"
          alt="" loading="lazy" />
        <span class="card-number">${String(champion.key).padStart(3, "0")}</span>
        <span class="card-open" aria-hidden="true">↗</span>
      </span>
      <span class="card-info">
        <span class="champion-title">${champion.title}</span>
        <span class="champion-name">${champion.name}</span>
        <span class="card-tags">${champion.tags.slice(0, 2).map((tag) => `<span>${roleNames[tag] || tag}</span>`).join("")}</span>
      </span>`;
    card.addEventListener("click", () => openChampion(champion));
    column.append(card);
    return column;
  });
  grid.replaceChildren(...cards);
}

function openChampion(champion) {
  const image = `${API_BASE}/cdn/img/champion/splash/${champion.id}_0.jpg`;
  const difficulty = champion.info.difficulty;
  const difficultyLabel = difficulty <= 3 ? "Sencilla" : difficulty <= 6 ? "Moderada" : "Alta";
  modalBody.innerHTML = `
    <div class="modal-hero" style="--champion-splash: url('${image}')">
      <div class="modal-hero-content">
        <p class="eyebrow section-eyebrow">${champion.tags.map((tag) => roleNames[tag] || tag).join(" · ")}</p>
        <h2 id="modal-name">${champion.name}</h2>
        <p>${champion.title}</p>
      </div>
    </div>
    <div class="modal-details">
      <div class="difficulty-row"><span>DIFICULTAD</span><strong>${difficultyLabel}</strong><span class="difficulty-meter" aria-label="Dificultad ${difficulty} de 10">${Array.from({ length: 10 }, (_, index) => `<i class="${index < difficulty ? "filled" : ""}"></i>`).join("")}</span></div>
      <h3>Historia</h3>
      <p class="lore-copy">${champion.lore}</p>
      <h3>Habilidades</h3>
      <div class="ability-list">
        <div class="ability">
          <img src="${API_BASE}/cdn/${champion.version}/img/passive/${champion.passive.image.full}" alt="" />
          <div><strong>${champion.passive.name} <span>· PASIVA</span></strong><p>${champion.passive.description}</p></div>
        </div>
        ${champion.spells.map((spell, index) => `
          <div class="ability">
            <img src="${API_BASE}/cdn/${champion.version}/img/spell/${spell.image.full}" alt="" />
            <div><strong>${spell.name} <span>· ${["Q", "W", "E", "R"][index] || ""}</span></strong><p>${spell.description}</p></div>
          </div>`).join("")}
      </div>
    </div>`;
  modal.show();
}

document.querySelector("#role-filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-role]");
  if (!button) return;
  selectedRole = button.dataset.role;
  document.querySelectorAll(".filter-btn").forEach((filter) => {
    const active = filter === button;
    filter.classList.toggle("active", active);
    filter.setAttribute("aria-pressed", String(active));
  });
  renderChampions();
});

searchInput.addEventListener("input", renderChampions);
sortSelect.addEventListener("change", renderChampions);
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape" && document.activeElement === searchInput) searchInput.blur();
});

modal = new bootstrap.Modal(document.querySelector("#champion-modal"));
loadChampions();