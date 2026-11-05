const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const extraPaths = [
  "/opt/homebrew/opt/openjdk@17/bin",
  path.join(os.homedir(), ".maestro", "bin"),
];
for (const dir of extraPaths) {
  if (fs.existsSync(dir)) {
    process.env.PATH = `${dir}${path.delimiter}${process.env.PATH ?? ""}`;
  }
}

process.env.MAESTRO_CLI_NO_ANALYTICS = process.env.MAESTRO_CLI_NO_ANALYTICS ?? "1";
process.env.MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED =
  process.env.MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED ?? "true";

const platform = process.argv[2] ?? "android";
const appIds = {
  ios: "com.ezerway.EzGolf",
  android: "com.ezerway.ezgolf",
};
const appId = appIds[platform];

if (!appId) {
  console.error("Usage: node ./scripts/e2e.js [ios|android]");
  process.exit(1);
}

const result = spawnSync("maestro", ["test", "-e", `MAESTRO_APP_ID=${appId}`, ".maestro"], {
  stdio: "inherit",
  env: { ...process.env, MAESTRO_APP_ID: appId },
});

if (result.error) {
  console.error('Maestro CLI was not found. Install it with: curl -Ls "https://get.maestro.mobile.dev" | bash');
  process.exit(1);
}

process.exit(result.status ?? 1);
