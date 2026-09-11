import fs from "node:fs";
import path from "node:path";

export const EXPECTED_ROOT = "/home/pav4o71/Projects/nomi-numi-shop";
export const PROTECTED_HOST_PORT = "5433";
export const PASSWORD_EXPECTED_LENGTH = 43;
export const PASSWORD_PATTERN = /^[A-Za-z0-9_-]+$/;
export const MIGRATIONS_FOLDER = path.join(EXPECTED_ROOT, "drizzle");

const ENVIRONMENTS = Object.freeze({
  dev: Object.freeze({
    id: "dev",
    host: "127.0.0.1",
    port: "55432",
    database: "nomi_numi_shop_dev",
    user: "nomi_numi_dev",
    credentialFile: path.join(EXPECTED_ROOT, "var/docker/dev.env"),
    composeProject: "nomi-numi-shop-dev",
    containerName: "nomi-numi-shop-dev-postgres-1",
  }),
  test: Object.freeze({
    id: "test",
    host: "127.0.0.1",
    port: "55433",
    database: "nomi_numi_shop_test",
    user: "nomi_numi_test",
    credentialFile: path.join(EXPECTED_ROOT, "var/docker/test.env"),
    composeProject: "nomi-numi-shop-test",
    containerName: "nomi-numi-shop-test-postgres-1",
  }),
});

export function fail(message) {
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}

export function resolveEnvironment(envId) {
  if (envId !== "dev" && envId !== "test") {
    fail(`unsupported environment '${envId ?? ""}' (only 'dev' or 'test')`);
  }

  return ENVIRONMENTS[envId];
}

function modeOctal(filePath) {
  return (fs.statSync(filePath).mode & 0o777).toString(8);
}

function requireRegularFile(filePath) {
  if (fs.lstatSync(filePath).isSymbolicLink()) {
    fail(`credential path must not be a symlink: ${filePath}`);
  }

  if (!fs.statSync(filePath).isFile()) {
    fail(`credential path must be a regular file: ${filePath}`);
  }
}

function requireCanonicalUnderRoot(filePath) {
  const resolved = fs.realpathSync(filePath);
  if (resolved !== filePath && !resolved.startsWith(`${EXPECTED_ROOT}${path.sep}`)) {
    fail(`credential path must resolve under ${EXPECTED_ROOT}`);
  }

  if (!resolved.startsWith(`${EXPECTED_ROOT}${path.sep}`)) {
    fail(`credential path must resolve under ${EXPECTED_ROOT}`);
  }
}

/**
 * Parse Phase 1D credential files as DATA (never source/eval).
 * Mirrors the Phase 1D contract without printing secrets.
 */
export function loadValidatedCredentials(envId) {
  const identity = resolveEnvironment(envId);
  const envFile = identity.credentialFile;

  if (!fs.existsSync(envFile)) {
    fail(`credentials file missing: ${envFile}`);
  }

  requireRegularFile(envFile);
  requireCanonicalUnderRoot(envFile);

  if (modeOctal(envFile) !== "600") {
    fail(`credentials file mode must be 600: ${envFile}`);
  }

  const seen = {
    NOMI_ENVIRONMENT: 0,
    POSTGRES_HOST_PORT: 0,
    POSTGRES_DB: 0,
    POSTGRES_USER: 0,
    POSTGRES_PASSWORD: 0,
  };
  const loaded = {
    NOMI_ENVIRONMENT: "",
    POSTGRES_HOST_PORT: "",
    POSTGRES_DB: "",
    POSTGRES_USER: "",
    POSTGRES_PASSWORD: "",
  };

  const contents = fs.readFileSync(envFile, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine;
    if (line === "" || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator <= 0) {
      fail(`invalid credentials line in ${envFile}`);
    }

    const key = line.slice(0, separator);
    const value = line.slice(separator + 1);

    if (!(key in seen)) {
      fail(`unexpected key '${key}' in ${envFile}`);
    }

    if (seen[key] === 1) {
      fail(`duplicate key ${key} in ${envFile}`);
    }

    seen[key] = 1;
    loaded[key] = value;
  }

  for (const key of Object.keys(seen)) {
    if (seen[key] !== 1) {
      fail(`credentials file ${envFile} is missing required key ${key}`);
    }
  }

  if (loaded.NOMI_ENVIRONMENT !== identity.id) {
    fail(`NOMI_ENVIRONMENT in ${envFile} must be '${identity.id}'`);
  }

  if (loaded.POSTGRES_HOST_PORT !== identity.port) {
    fail(`POSTGRES_HOST_PORT in ${envFile} must be '${identity.port}'`);
  }

  if (loaded.POSTGRES_HOST_PORT === PROTECTED_HOST_PORT) {
    fail(`refusing protected host port ${PROTECTED_HOST_PORT}`);
  }

  if (loaded.POSTGRES_DB !== identity.database) {
    fail(`POSTGRES_DB in ${envFile} must be '${identity.database}'`);
  }

  if (loaded.POSTGRES_USER !== identity.user) {
    fail(`POSTGRES_USER in ${envFile} must be '${identity.user}'`);
  }

  if (
    loaded.POSTGRES_PASSWORD.length !== PASSWORD_EXPECTED_LENGTH ||
    !PASSWORD_PATTERN.test(loaded.POSTGRES_PASSWORD)
  ) {
    fail("POSTGRES_PASSWORD failed format contract checks");
  }

  return {
    identity,
    host: identity.host,
    port: Number(identity.port),
    database: identity.database,
    user: identity.user,
    password: loaded.POSTGRES_PASSWORD,
  };
}

export function assertSafeConnectionTarget(credentials) {
  if (credentials.port === Number(PROTECTED_HOST_PORT)) {
    fail(`refusing protected host port ${PROTECTED_HOST_PORT}`);
  }

  if (credentials.host !== "127.0.0.1") {
    fail(`refusing non-loopback database host '${credentials.host}'`);
  }

  if (
    credentials.port !== Number(credentials.identity.port) ||
    credentials.database !== credentials.identity.database ||
    credentials.user !== credentials.identity.user
  ) {
    fail("connection identity drifted from fixed environment allowlist");
  }
}
