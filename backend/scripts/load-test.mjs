#!/usr/bin/env node
/**
 * Simple load test for Casa backend.
 *
 * Usage:
 *   LOAD_TEST_URL=https://your-api.railway.app node scripts/load-test.mjs
 *   LOAD_TEST_CONCURRENT=50 LOAD_TEST_REQUESTS=500 node scripts/load-test.mjs
 */

const BASE = process.env.LOAD_TEST_URL ?? "http://localhost:3000";
const CONCURRENT = Number(process.env.LOAD_TEST_CONCURRENT ?? 20);
const TOTAL = Number(process.env.LOAD_TEST_REQUESTS ?? 200);

async function hitHealth() {
  const res = await fetch(`${BASE}/health`);
  return res.ok;
}

async function runBatch(batchSize) {
  return Promise.all(Array.from({ length: batchSize }, () => hitHealth()));
}

async function main() {
  console.log(`Load test: ${TOTAL} requests, ${CONCURRENT} concurrent → ${BASE}/health`);

  let ok = 0;
  let fail = 0;
  const start = Date.now();

  for (let done = 0; done < TOTAL; ) {
    const batch = Math.min(CONCURRENT, TOTAL - done);
    const results = await runBatch(batch);
    for (const passed of results) {
      if (passed) ok++;
      else fail++;
    }
    done += batch;
  }

  const elapsed = (Date.now() - start) / 1000;
  const rps = (TOTAL / elapsed).toFixed(1);

  console.log(`
Results:
  Total:   ${TOTAL}
  OK:      ${ok}
  Failed:  ${fail}
  Time:    ${elapsed.toFixed(2)}s
  RPS:     ${rps}
`);

  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
