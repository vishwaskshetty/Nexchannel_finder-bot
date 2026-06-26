import fs from 'fs';

try {
  const content = fs.readFileSync('wrangler.toml', 'utf8');
  const hasTriggers = /^[ \t]*\[triggers\]/m.test(content);
  const hasCrons = /^[ \t]*crons[ \t]*=/m.test(content);
  const isConfigured = hasTriggers && hasCrons;
  fs.writeFileSync('src/cron_config.ts', `export const CRON_CONFIGURED = ${isConfigured};\n`);
  console.log(`[build-cron-config] Generated src/cron_config.ts: CRON_CONFIGURED = ${isConfigured}`);
} catch (e) {
  console.error("[build-cron-config] Error generating src/cron_config.ts:", e);
  fs.writeFileSync('src/cron_config.ts', `export const CRON_CONFIGURED = true;\n`);
}
