import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
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

async function dashboardHarness(fetchResponse) {
  const elements = new Map();
  const requests = [];
  const document = {
    addEventListener() {},
    querySelector(selector) {
      if (!elements.has(selector)) {
        const attributes = new Map();
        const styles = new Map();
        elements.set(selector, {
          textContent: "",
          hidden: true,
          disabled: false,
          href: "https://resultadoelectoral.onpe.gob.pe/",
          attributes,
          styles,
          style: {
            setProperty: (key, value) => styles.set(key, value),
            removeProperty: (key) => styles.delete(key),
          },
          setAttribute: (key, value) => attributes.set(key, value),
          removeAttribute: (key) => attributes.delete(key),
        });
      }
      return elements.get(selector);
    },
  };
  const source = await readFile(new URL("../assets/dashboard.js", import.meta.url), "utf8");
  const context = vm.createContext({
    document,
    URL,
    Intl,
    Error,
    fetch: async (...args) => {
      requests.push(args);
      return fetchResponse();
    },
  });
  vm.runInContext(source.replace(/^export /gm, ""), context);
  return {
    elements,
    requests,
    load: () => vm.runInContext("loadSnapshot(dashboardElements())", context),
  };
}

function assertUnavailable(elements) {
  assert.match(
    elements.get("#data-status").textContent,
    /Datos oficiales temporalmente no disponibles/,
  );
  assert.equal(elements.get("#progress-section").hidden, true);
  assert.equal(elements.get("#official-update-state").hidden, true);
  assert.equal(elements.get("#official-update-state").textContent, "");
  for (const selector of ["#processed-percentage", "#processed-actas", "#retrieved-at"]) {
    assert.equal(elements.get(selector).textContent, "—");
  }
  assert.equal(elements.get("#processed-progress").attributes.has("aria-valuenow"), false);
  assert.equal(elements.get("#processed-progress").styles.has("--progress-value"), false);
  assert.equal(elements.get("#official-source-link").href, "https://resultadoelectoral.onpe.gob.pe/");
  assert.equal(elements.get("#refresh-button").disabled, false);
}

test("missing snapshot shows official data unavailable without invented metrics", async () => {
  const harness = await dashboardHarness(() => ({ ok: false, status: 404 }));
  await harness.load();
  assertUnavailable(harness.elements);
  assert.equal(harness.requests.length, 1);
  assert.equal(harness.requests[0][0], "./public/data/latest.json");
  assert.equal(harness.requests[0][1].cache, "no-store");
  assert.match(harness.elements.get("#data-status").textContent, /HTTP 404/);
});

test("network failure and invalid present data never render metrics", async () => {
  for (const response of [
    () => { throw new Error("Network unavailable"); },
    () => ({ ok: true, json: async () => ({}) }),
    () => ({ ok: true, json: async () => { throw new SyntaxError("Invalid JSON"); } }),
  ]) {
    const harness = await dashboardHarness(response);
    await harness.load();
    assertUnavailable(harness.elements);
  }
});

test("refresh clears stale metrics on failure and can recover with verified data", async () => {
  let available = true;
  const harness = await dashboardHarness(() => available
    ? { ok: true, json: async () => ({
      ...validSnapshot,
      officialUpdateState: "ACTUALIZADO",
      source: {
        ...validSnapshot.source,
        url: "https://resultadoelectoral.onpe.gob.pe/presentacion-backend/resumen-general/mapa-calor",
      },
    }) }
    : { ok: false, status: 404 });
  await harness.load();
  assert.equal(harness.elements.get("#progress-section").hidden, false);
  assert.equal(harness.elements.get("#processed-actas").textContent, "476");
  assert.equal(harness.elements.get("#official-update-state").hidden, false);
  assert.match(harness.elements.get("#official-source-link").href, /mapa-calor$/);
  available = false;
  await harness.load();
  assertUnavailable(harness.elements);
  available = true;
  await harness.load();
  assert.equal(harness.elements.get("#progress-section").hidden, false);
  assert.equal(harness.elements.get("#processed-percentage").textContent, "18.851 %");
  assert.equal(harness.elements.get("#refresh-button").disabled, false);
  assert.ok(harness.requests.every(([url]) => url === "./public/data/latest.json"));
});

test("static entrypoint has an unavailable-data fallback with hidden metrics", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="data-status"[^>]*>[\s\S]*?Datos oficiales temporalmente no disponibles/);
  assert.match(html, /id="progress-section" hidden/);
  assert.match(html, /id="processed-percentage">—/);
  assert.match(html, /id="processed-actas">—/);
  assert.doesNotMatch(html, /aria-valuenow=/);
});

test("Pages tolerates only collection failure and reports it while retaining hard gates", async () => {
  const workflow = (await readFile(
    new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8",
  )).replace(/\r\n/g, "\n");
  const steps = workflow.split(/^      - name: /m).slice(1);
  const step = (name) => {
    const found = steps.find((block) => block.startsWith(`${name}\n`));
    assert.ok(found, `Missing workflow step: ${name}`);
    return found;
  };
  const collect = step("Collect validated ONPE snapshot");
  assert.match(collect, /\n        id: collect\n/);
  assert.match(collect, /\n        continue-on-error: true\n/);
  assert.match(collect, /\n        run: npm run collect:onpe\n/);
  const report = step("Report unavailable official data");
  assert.match(report, /if: .*always\(\).*steps\.collect\.outcome == 'failure'/);
  assert.match(report, /::warning::/);
  assert.match(report, /GITHUB_STEP_SUMMARY/);
  assert.match(report, /Datos oficiales temporalmente no disponibles/);
  assert.doesNotMatch(report, /steps\.collect\.conclusion/);
  assert.equal((workflow.match(/continue-on-error:/g) ?? []).length, 1);
  assert.doesNotMatch(workflow, /\|\| true|public\/data\/latest\.json|curl|wget/);
  for (const [name, command] of [
    ["Run tests", "npm test"],
    ["Run structural checks", "npm run check"],
    ["Build static site", "npm run build"],
  ]) {
    const gate = step(name);
    assert.ok(gate.includes(`\n        run: ${command}\n`));
    assert.doesNotMatch(gate, /continue-on-error:|if:|always\(\)/);
  }
  assert.doesNotMatch(step("Upload Pages artifact"), /continue-on-error:|if:|always\(\)/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /cron: "17 \*\/6 \* \* \*"/);
  assert.match(workflow, /needs: build/);
  const orderedNames = [
    "Collect validated ONPE snapshot",
    "Report unavailable official data",
    "Run tests",
    "Run structural checks",
    "Build static site",
    "Upload Pages artifact",
  ];
  const indexes = orderedNames.map((name) => steps.indexOf(step(name)));
  assert.deepEqual(indexes, [...indexes].sort((a, b) => a - b));
  assert.match(step("Upload Pages artifact"), /path: dist/);
  assert.doesNotMatch(step("Deploy to GitHub Pages"), /continue-on-error:|if:|always\(\)/);
});

test("accepts a complete San Martín progress snapshot", () => {
  assert.deepEqual(validateSnapshot(validSnapshot), validSnapshot);
  assert.deepEqual(formatProcessedActas(validSnapshot.countProgress), {
    percentage: "18.851 %",
    actas: "476",
  });
});

test("rejects nonofficial, lookalike, and non-HTTPS source URLs", () => {
  for (const url of [
    "https://example.com/resultados",
    "https://resultadoelectoral.onpe.gob.pe.example.com/",
    "http://resultadoelectoral.onpe.gob.pe/",
  ]) {
    assert.throws(
      () => validateSnapshot({ ...validSnapshot, source: { name: "ONPE", url } }),
      /enlace oficial del snapshot/,
    );
  }
});

test("rejects invalid progress and candidate-result payloads", () => {
  assert.throws(
    () => validateSnapshot({
      ...validSnapshot,
      countProgress: { ...validSnapshot.countProgress, ubigeoNivel01: 150000 },
    }),
    /no corresponde a San Martín/,
  );
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
