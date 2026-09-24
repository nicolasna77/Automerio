// Démarre Docker Desktop s'il est arrêté, puis la base Postgres du
// docker-compose.yml. Usage : npm run db:up
import { execSync, spawn } from "node:child_process";

function dockerReady() {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function launchDockerDesktop() {
  if (process.platform === "win32") {
    spawn("C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe", {
      detached: true,
      stdio: "ignore",
    }).unref();
  } else if (process.platform === "darwin") {
    execSync("open -a Docker");
  } else {
    throw new Error("Docker ne répond pas : démarrez le démon Docker.");
  }
}

async function main() {
  if (!dockerReady()) {
    console.log("Démarrage de Docker Desktop…");
    launchDockerDesktop();
    const deadline = Date.now() + 180_000;
    while (!dockerReady()) {
      if (Date.now() > deadline) {
        throw new Error("Docker n'a pas démarré après 3 minutes.");
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  execSync("docker compose up -d --wait", { stdio: "inherit" });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
