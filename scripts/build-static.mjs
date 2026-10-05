import { copyFile, lstat, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSnapshot } from "../assets/dashboard.js";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIRECTORY = path.join(PROJECT_ROOT, "dist");
const STATIC_FILES = [
  { relativePath: "index.html", label: "the static entrypoint" },
  { relativePath: "assets/styles.css", label: "the stylesheet asset" },
  { relativePath: "assets/dashboard.js", label: "the dashboard asset" },
];
const SNAPSHOT_PATH = "public/data/latest.json";

async function requireFile(relativePath, label) {
  const sourcePath = path.join(PROJECT_ROOT, relativePath);

  let sourceStats;
  try {
    sourceStats = await lstat(sourcePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`Static build requires ${label} at ${relativePath}.`);
    }
    throw error;
  }

  if (!sourceStats.isFile()) {
    throw new Error(`Static build requires ${label} at ${relativePath} to be a file.`);
  }

  return sourcePath;
}

async function optionalFile(relativePath) {
  const sourcePath = path.join(PROJECT_ROOT, relativePath);

  try {
    const sourceStats = await lstat(sourcePath);
    if (!sourceStats.isFile()) {
      throw new Error(`Optional snapshot at ${relativePath} must be a file.`);
    }
    return sourcePath;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function validateSnapshotFile(snapshotPath) {
  let snapshot;
  try {
    snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  } catch (error) {
    throw new Error(`Snapshot at ${SNAPSHOT_PATH} is not valid JSON: ${error.message}`);
  }

  try {
    validateSnapshot(snapshot);
  } catch (error) {
    throw new Error(`Snapshot at ${SNAPSHOT_PATH} is not validated: ${error.message}`);
  }
}

async function copyToDist(relativePath, sourcePath) {
  const destinationPath = path.join(DIST_DIRECTORY, relativePath);
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await copyFile(sourcePath, destinationPath);
}

export async function buildStatic() {
  await rm(DIST_DIRECTORY, { recursive: true, force: true });
  await mkdir(DIST_DIRECTORY, { recursive: true });

  const requiredFiles = await Promise.all(
    STATIC_FILES.map(async ({ relativePath, label }) => ({
      relativePath,
      sourcePath: await requireFile(relativePath, label),
    })),
  );
  const snapshotPath = await optionalFile(SNAPSHOT_PATH);

  if (snapshotPath) {
    await validateSnapshotFile(snapshotPath);
  }

  await Promise.all(
    requiredFiles.map(({ relativePath, sourcePath }) => copyToDist(relativePath, sourcePath)),
  );

  if (snapshotPath) {
    await copyToDist(SNAPSHOT_PATH, snapshotPath);
  }
}

const isMainModule = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMainModule) {
  buildStatic()
    .then(() => {
      console.log("Built static site in dist/.");
    })
    .catch((error) => {
      console.error(`Static build failed: ${error.message}`);
      process.exitCode = 1;
    });
}
