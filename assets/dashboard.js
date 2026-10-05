const SNAPSHOT_PATH = "./public/data/latest.json";
const SAN_MARTIN_UBIGEO = 210000;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isOfficialOnpeUrl(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "resultadoelectoral.onpe.gob.pe";
  } catch {
    return false;
  }
}

export function validateSnapshot(snapshot) {
  assert(isPlainObject(snapshot), "El snapshot no tiene un formato válido.");
  assert(isPlainObject(snapshot.source), "Falta la procedencia oficial del snapshot.");
  assert(snapshot.source.name === "ONPE", "La procedencia del snapshot no es ONPE.");
  assert(isOfficialOnpeUrl(snapshot.source.url), "El enlace oficial del snapshot no es válido.");
  assert(
    typeof snapshot.retrievedAt === "string" && !Number.isNaN(Date.parse(snapshot.retrievedAt)),
    "La fecha de actualización del snapshot no es válida.",
  );
  assert(isPlainObject(snapshot.countProgress), "Faltan los datos de actas procesadas.");

  const { countProgress } = snapshot;
  assert(
    countProgress.ubigeoNivel01 === SAN_MARTIN_UBIGEO,
    "El snapshot no corresponde a San Martín.",
  );
  assert(
    typeof countProgress.porcentajeActasContabilizadas === "number" &&
      Number.isFinite(countProgress.porcentajeActasContabilizadas) &&
      countProgress.porcentajeActasContabilizadas >= 0 &&
      countProgress.porcentajeActasContabilizadas <= 100,
    "El porcentaje de actas no es válido.",
  );
  assert(
    Number.isSafeInteger(countProgress.actasContabilizadas) &&
      countProgress.actasContabilizadas >= 0,
    "La cantidad de actas no es válida.",
  );
  assert(
    isPlainObject(snapshot.candidateResults) && snapshot.candidateResults.status === "unavailable",
    "Los resultados de candidaturas no son verificables.",
  );

  return snapshot;
}

export function formatProcessedActas(countProgress) {
  return {
    percentage: `${new Intl.NumberFormat("es-PE", {
      maximumFractionDigits: 3,
    }).format(countProgress.porcentajeActasContabilizadas)} %`,
    actas: new Intl.NumberFormat("es-PE").format(countProgress.actasContabilizadas),
  };
}

export function formatRetrievedAt(retrievedAt) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
    timeZoneName: "short",
  }).format(new Date(retrievedAt));
}

function dashboardElements() {
  return {
    refreshButton: document.querySelector("#refresh-button"),
    status: document.querySelector("#data-status"),
    progressSection: document.querySelector("#progress-section"),
    percentage: document.querySelector("#processed-percentage"),
    actas: document.querySelector("#processed-actas"),
    progressBar: document.querySelector("#processed-progress"),
    retrievedAt: document.querySelector("#retrieved-at"),
    officialState: document.querySelector("#official-update-state"),
    sourceName: document.querySelector("#source-name"),
    sourceLink: document.querySelector("#official-source-link"),
  };
}

function setStatus(elements, message) {
  elements.status.textContent = message;
}

function renderSnapshot(elements, snapshot) {
  const progress = formatProcessedActas(snapshot.countProgress);

  elements.percentage.textContent = progress.percentage;
  elements.actas.textContent = progress.actas;
  elements.progressBar.style.setProperty(
    "--progress-value",
    `${snapshot.countProgress.porcentajeActasContabilizadas}%`,
  );
  elements.progressBar.setAttribute(
    "aria-valuenow",
    String(snapshot.countProgress.porcentajeActasContabilizadas),
  );
  elements.progressBar.setAttribute(
    "aria-valuetext",
    `${progress.percentage} de actas procesadas; ${progress.actas} actas contabilizadas`,
  );
  elements.retrievedAt.textContent = `${formatRetrievedAt(snapshot.retrievedAt)} (hora de Perú)`;
  elements.sourceName.textContent = snapshot.source.name;
  elements.sourceLink.href = snapshot.source.url;
  elements.sourceLink.textContent = "Consultar resultados oficiales en ONPE";

  if (typeof snapshot.officialUpdateState === "string" && snapshot.officialUpdateState.trim()) {
    elements.officialState.hidden = false;
    elements.officialState.textContent = `Estado informado por ONPE: ${snapshot.officialUpdateState.trim()}.`;
  } else {
    elements.officialState.hidden = true;
    elements.officialState.textContent = "";
  }

  elements.progressSection.hidden = false;
  setStatus(elements, "Datos locales actualizados correctamente.");
}

function renderUnavailable(elements, error) {
  elements.progressSection.hidden = true;
  elements.percentage.textContent = "—";
  elements.actas.textContent = "—";
  elements.retrievedAt.textContent = "—";
  elements.progressBar.style.removeProperty("--progress-value");
  elements.progressBar.removeAttribute("aria-valuenow");
  elements.progressBar.setAttribute("aria-valuetext", "Sin datos cargados");
  elements.officialState.hidden = true;
  elements.officialState.textContent = "";
  elements.sourceName.textContent = "ONPE";
  elements.sourceLink.href = "https://resultadoelectoral.onpe.gob.pe/";
  setStatus(
    elements,
    `Datos oficiales temporalmente no disponibles. No fue posible validar el snapshot local: ${error.message} Consulte la fuente oficial enlazada.`,
  );
}

async function loadSnapshot(elements) {
  elements.refreshButton.disabled = true;
  setStatus(elements, "Cargando el snapshot local de actas procesadas…");

  try {
    const response = await fetch(SNAPSHOT_PATH, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`La solicitud local respondió con HTTP ${response.status}.`);
    }

    const snapshot = validateSnapshot(await response.json());
    renderSnapshot(elements, snapshot);
  } catch (error) {
    renderUnavailable(
      elements,
      error instanceof Error ? error : new Error("Ocurrió un error desconocido."),
    );
  } finally {
    elements.refreshButton.disabled = false;
  }
}

function initializeDashboard() {
  const elements = dashboardElements();
  elements.refreshButton.addEventListener("click", () => loadSnapshot(elements));
  loadSnapshot(elements);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initializeDashboard);
}
