import assert from "node:assert/strict";
import { buildSnapshot, SAN_MARTIN_UBIGEO, SOURCE_URL } from "./collect-onpe-snapshot.mjs";

const retrievedAt = "2026-10-05T12:00:00.000Z";
const fixture = {
  data: [
    {
      ubigeoNivel01: SAN_MARTIN_UBIGEO,
      porcentajeActasContabilizadas: 18.851,
      actasContabilizadas: 476,
      estadoActualizacion: "ACTUALIZADO",
    },
  ],
};

const snapshot = buildSnapshot(fixture, retrievedAt);

assert.equal(snapshot.source.name, "ONPE");
assert.equal(snapshot.source.url, SOURCE_URL);
assert.equal(snapshot.retrievedAt, retrievedAt);
assert.equal(snapshot.officialUpdateState, "ACTUALIZADO");
assert.deepEqual(snapshot.countProgress, {
  ubigeoNivel01: SAN_MARTIN_UBIGEO,
  porcentajeActasContabilizadas: 18.851,
  actasContabilizadas: 476,
});
assert.deepEqual(snapshot.candidateResults, { status: "unavailable" });
assert.throws(
  () =>
    buildSnapshot(
      {
        data: [
          {
            ubigeoNivel01: SAN_MARTIN_UBIGEO,
            porcentajeActasContabilizadas: "18.851",
            actasContabilizadas: 476,
          },
        ],
      },
      retrievedAt,
    ),
  /invalid porcentajeActasContabilizadas/,
);

console.log("Snapshot fixture and data contract checks passed.");
