#!/usr/bin/env node

const { runSeed } = require('./todayStaffDemoSeed');

function parseArgs(argv) {
  const args = {
    dryRun: true
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--db') {
      args.dbPath = argv[index + 1];
      index += 1;
    } else if (arg === '--base-business-day') {
      args.baseBusinessDay = argv[index + 1];
      index += 1;
    } else if (arg === '--apply') {
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

(async () => {
  const result = await runSeed(parseArgs(process.argv));
  console.log(JSON.stringify(result, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
