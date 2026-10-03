import { PrismaClient } from '@prisma/client';
import { build350PlayersDataset } from './seed-data-builder';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding 350 IPL Auction players into database...');

  // Clear existing players
  await prisma.player.deleteMany({});

  const players = build350PlayersDataset();

  for (const p of players) {
    await prisma.player.create({
      data: {
        id: p.id,
        name: p.name,
        country: p.country,
        role: p.role,
        isOverseas: p.isOverseas,
        basePrice: p.basePrice,
        battingRating: p.battingRating,
        bowlingRating: p.bowlingRating,
        overallRating: p.overallRating,
        set: p.set,
        retainedByTeamId: p.retainedByTeamId || null,
        retainedPrice: p.retainedPrice || null,
      },
    });
  }

  console.log(`✅ Successfully seeded ${players.length} players into the database!`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
