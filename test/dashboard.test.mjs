import assert from "node:assert/strict";
import test from "node:test";
import {
  formatProcessedActas,
  validateSnapshot,
} from "../assets/dashboard.js";

const validSnapshot = {
  source: {
    name: "ONPE",
    url: "https://resultadoelectoral.onpe.gob.pe/",
  },
  retrievedAt: "2026-10-05T12:00:00.000Z",
  countProgress: {
    ubigeoNivel01: 210000,
    porcentajeActasContabilizadas: 18.851,
    actasContabilizadas: 476,
  },
  candidateResults: {
    status: "unavailable",
  },
};

test("accepts a complete San Martín progress snapshot", () => {
  assert.deepEqual(validateSnapshot(validSnapshot), validSnapshot);
  assert.deepEqual(formatProcessedActas(validSnapshot.countProgress), {
    percentage: "18.851 %",
    actas: "476",
  });
});

test("rejects a snapshot whose HTTPS source is not the official ONPE hostname", () => {
  assert.throws(
    () =>
      validateSnapshot({
        ...validSnapshot,
        source: {
          ...validSnapshot.source,
          url: "https://example.com/resultados",
        },
      }),
    /enlace oficial del snapshot/,
  );
});

test("rejects invalid progress and candidate-result payloads", () => {
  assert.throws(
    () =>
      validateSnapshot({
        ...validSnapshot,
        countProgress: {
          ...validSnapshot.countProgress,
          porcentajeActasContabilizadas: 100.1,
        },
      }),
    /porcentaje de actas/,
  );
  assert.throws(
    () =>
      validateSnapshot({
        ...validSnapshot,
        candidateResults: { status: "available" },
      }),
    /candidaturas/,
  );
});
