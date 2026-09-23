import { initMonitoring } from "./monitoring.js";
import { env } from "./config/env.js";
import { connectRedis, startBackgroundWorkers } from "./background.js";

initMonitoring();

async function start() {
  await connectRedis();
  startBackgroundWorkers();

  console.log(`
⚙️  Casa worker running (PROCESS_ROLE=worker)
   Webhook queue + scheduled jobs active
  `);
}

start().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
