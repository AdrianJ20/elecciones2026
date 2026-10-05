import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCE_URL =
  "https://resultadoelectoral.onpe.gob.pe/presentacion-backend/resumen-general/mapa-calor?idAmbitoGeografico=1&idEleccion=1&tipoFiltro=ambito_geografico";

export const SAN_MARTIN_UBIGEO = 210000;

const OUTPUT_PATH = path.resolve("public/data/latest.json");
const UPDATE_STATE_FIELDS = [
  "estadoActualizacion",
  "estado",
  "estadoProceso",
  "estadoPublicacion",
];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function findMatchingRecords(value, matches = [], visited = new WeakSet()) {
  if (value === null || typeof value !== "object" || visited.has(value)) {
    return matches;
  }

  visited.add(value);

  if (isPlainObject(value) && value.ubigeoNivel01 === SAN_MARTIN_UBIGEO) {
    matches.push(value);
  }

  for (const child of Object.values(value)) {
    findMatchingRecords(child, matches, visited);
  }

  return matches;
}

function assertProgressNumber(value, fieldName, { integer = false } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`ONPE response has an invalid ${fieldName} value.`);
  }

  if (value < 0 || (integer && !Number.isSafeInteger(value))) {
    throw new Error(`ONPE response has an out-of-range ${fieldName} value.`);
  }

  return value;
}

function findOfficialUpdateState(record, response) {
  for (const source of [record, response]) {
    if (!isPlainObject(source)) {
      continue;
    }

    for (const field of UPDATE_STATE_FIELDS) {
      const value = source[field];
      if (typeof value === "string" && value.trim() !== "") {
        return value.trim();
      }
    }
  }

  return undefined;
}

export function buildSnapshot(response, retrievedAt = new Date().toISOString()) {
  if (typeof retrievedAt !== "string" || Number.isNaN(Date.parse(retrievedAt))) {
    throw new Error("A valid ISO retrieval timestamp is required.");
  }

  const matches = findMatchingRecords(response);
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one San Martín record from ONPE; received ${matches.length}.`,
    );
  }

  const record = matches[0];
  const porcentajeActasContabilizadas = assertProgressNumber(
    record.porcentajeActasContabilizadas,
    "porcentajeActasContabilizadas",
  );
  if (porcentajeActasContabilizadas > 100) {
    throw new Error("ONPE response has an out-of-range porcentajeActasContabilizadas value.");
  }

  const actasContabilizadas = assertProgressNumber(
    record.actasContabilizadas,
    "actasContabilizadas",
    { integer: true },
  );

  const snapshot = {
    source: {
      name: "ONPE",
      url: SOURCE_URL,
    },
    retrievedAt,
    countProgress: {
      ubigeoNivel01: SAN_MARTIN_UBIGEO,
      porcentajeActasContabilizadas,
      actasContabilizadas,
    },
    candidateResults: {
      status: "unavailable",
    },
  };

  const officialUpdateState = findOfficialUpdateState(record, response);
  if (officialUpdateState !== undefined) {
    snapshot.officialUpdateState = officialUpdateState;
  }

  return snapshot;
}

async function writeSnapshotAtomically(snapshot, outputPath = OUTPUT_PATH) {
  const outputDirectory = path.dirname(outputPath);
  const temporaryPath = path.join(
    outputDirectory,
    `.latest-${process.pid}-${Date.now()}.json.tmp`,
  );

  await mkdir(outputDirectory, { recursive: true });
  try {
    await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

export async function collectSnapshot({ fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetchImpl(SOURCE_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`ONPE request failed with HTTP ${response.status}.`);
    }

    const payload = await response.json();
    const snapshot = buildSnapshot(payload);
    await writeSnapshotAtomically(snapshot);
    return snapshot;
  } finally {
    clearTimeout(timeout);
  }
}

const isMainModule = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMainModule) {
  collectSnapshot()
    .then((snapshot) => {
      console.log(
        `Saved validated ONPE snapshot for San Martín at ${snapshot.retrievedAt}.`,
      );
    })
    .catch((error) => {
      console.error(`Snapshot was not updated: ${error.message}`);
      process.exitCode = 1;
    });
}
