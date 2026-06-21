import { execSync } from 'child_process';

async function globalSetup() {
  console.log('Resetting and seeding database for E2E tests...');
  try {
    execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error during global setup database reset/seed:', error);
    throw error;
  }
}

export default globalSetup;
