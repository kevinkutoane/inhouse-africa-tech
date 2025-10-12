#!/usr/bin/env node
/**
 * Admin Password Hash Generator
 * 
 * Usage: node scripts/generate-admin-hash.js YourPasswordHere
 * 
 * This script generates a SHA-256 hash of your password to use in .env
 */

import { createHash } from 'crypto';

// Get password from command line argument
const password = process.argv[2];

if (!password) {
  console.error('❌ Error: Please provide a password as an argument');
  console.log('\nUsage: node scripts/generate-admin-hash.js YourPasswordHere');
  console.log('\nExample: node scripts/generate-admin-hash.js MySecurePassword123\n');
  process.exit(1);
}

// Generate SHA-256 hash
const hash = createHash('sha256').update(password).digest('hex');

console.log('\n✅ Password hash generated successfully!\n');
console.log('═'.repeat(70));
console.log('Add this to your .env file:');
console.log('═'.repeat(70));
console.log(`\nADMIN_PASSWORD_HASH=${hash}\n`);
console.log('═'.repeat(70));
console.log('\n⚠️  IMPORTANT: Never commit your .env file to version control!');
console.log('💡 TIP: Also update this in your Render dashboard environment variables\n');
