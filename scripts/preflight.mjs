#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const REQUIRED = {
  node: { minimum: [22, 0, 0], maximumExclusive: [23, 0, 0] },
  pnpm: { minimum: [11, 0, 0], maximumExclusive: [12, 0, 0] },
  python: { minimum: [3, 12, 0], maximumExclusive: [3, 14, 0] },
  uv: { minimum: [0, 8, 0], maximumExclusive: [1, 0, 0] },
};

function parseVersion(value) {
  const match = String(value).match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) throw new Error(`could not parse version from ${JSON.stringify(value)}`);
  return [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
}

function compare(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function supported(value, range) {
  const parsed = parseVersion(value);
  return compare(parsed, range.minimum) >= 0 && compare(parsed, range.maximumExclusive) < 0;
}

function commandVersion(command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    const detail = error.code === "ENOENT" ? "not installed or not on PATH" : error.message;
    throw new Error(`${command}: ${detail}`);
  }
}

function selfTest() {
  const cases = [
    ["22.0.0", REQUIRED.node, true],
    ["23.0.0", REQUIRED.node, false],
    ["Python 3.12.9", REQUIRED.python, true],
    ["Python 3.11.9", REQUIRED.python, false],
    ["uv 0.11.25", REQUIRED.uv, true],
  ];
  for (const [value, range, expected] of cases) {
    if (supported(value, range) !== expected) throw new Error(`preflight self-test failed for ${value}`);
  }
  try {
    parseVersion("unknown");
    throw new Error("preflight self-test accepted an invalid version");
  } catch (error) {
    if (!String(error.message).includes("could not parse")) throw error;
  }
  console.log("preflight self-test passed");
}

if (process.argv.includes("--self-test")) {
  selfTest();
  process.exit(0);
}

const observed = {
  node: process.version,
  pnpm: process.env.npm_config_user_agent?.match(/pnpm\/[^ ]+/)?.[0] ?? commandVersion("pnpm", ["--version"]),
  python: commandVersion("python3", ["--version"]),
  uv: commandVersion("uv", ["--version"]),
};

let failed = false;
for (const [tool, value] of Object.entries(observed)) {
  const range = REQUIRED[tool];
  if (supported(value, range)) {
    console.log(`ok ${tool}: ${value}`);
  } else {
    failed = true;
    console.error(
      `unsupported ${tool}: ${value}; expected >=${range.minimum.join(".")} and <${range.maximumExclusive.join(".")}`,
    );
  }
}

if (failed) process.exit(1);
