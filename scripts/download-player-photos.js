/**
 * IPL Auction Player Portraits Asset Manager
 *
 * Validates and manages high-quality local player portraits wearing national team colors
 * against a dark navy stadium background. Replaces legacy Wikipedia downloads.
 */

const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '../apps/web/public/images/players');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function slugify(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('=== IPL Auction Player Portrait Asset Audit ===\n');

  const seedFile = path.resolve(__dirname, '../apps/server/src/seed/seed-data-builder.ts');
  const seedContent = fs.readFileSync(seedFile, 'utf8');

  // Extract players from seed data
  const playerMatches = [
    ...seedContent.matchAll(
      /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*country:\s*'([^']+)',\s*role:\s*'([^']+)'/g
    ),
  ];

  const players = playerMatches.map((m) => ({
    id: m[1],
    name: m[2],
    country: m[3],
    role: m[4],
    slug: slugify(m[2]),
  }));

  console.log(`Total roster players in seed dataset: ${players.length}`);

  const fallbackPath = path.join(targetDir, 'fallback-portrait.png');
  const hasFallback = fs.existsSync(fallbackPath);
  console.log(`Fallback asset status: ${hasFallback ? '✓ PRESENT' : '✗ MISSING'} (${fallbackPath})\n`);

  const ready = [];
  const missing = [];

  for (const p of players) {
    const portraitPath = path.join(targetDir, `${p.slug}.png`);
    if (fs.existsSync(portraitPath)) {
      ready.push(p);
    } else {
      missing.push(p);
    }
  }

  console.log(`--- Portrait Coverage Summary ---`);
  console.log(`✓ Active National Team Portraits: ${ready.length} / ${players.length} (${Math.round((ready.length / players.length) * 100)}%)`);
  console.log(`⚡ Using Studio Fallback Portrait: ${missing.length} / ${players.length}`);

  if (missing.length > 0) {
    console.log(`\nPlayers currently routed to professional broadcast fallback:`);
    missing.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.name} (${p.country} - ${p.role}) -> /images/players/${p.slug}.png`);
    });
  }

  console.log('\n=== Audit Complete ===');
}

main().catch(console.error);
