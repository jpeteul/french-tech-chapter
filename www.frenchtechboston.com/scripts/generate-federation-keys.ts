/**
 * Generate Federation Ed25519 Keypair
 *
 * Run this script once when setting up a new chapter for federation.
 * The generated keys should be added to your environment variables.
 *
 * Usage:
 *   npx ts-node scripts/generate-federation-keys.ts
 *
 * Or if using Bun:
 *   bun run scripts/generate-federation-keys.ts
 */

async function generateKeys() {
  console.log('\n🔐 French Tech Federation - Key Generator\n');
  console.log('Generating Ed25519 keypair for cross-chapter communication...\n');

  try {
    // Generate keypair using Web Crypto API
    const keyPair = await crypto.subtle.generateKey(
      { name: 'Ed25519' },
      true, // extractable
      ['sign', 'verify']
    );

    // Export keys in standard formats
    const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    // Convert to base64
    const publicKeyB64 = bufferToBase64(publicKeyBuffer);
    const privateKeyB64 = bufferToBase64(privateKeyBuffer);

    console.log('✅ Keys generated successfully!\n');
    console.log('Add these to your .env file:\n');
    console.log('─'.repeat(60));
    console.log(`FEDERATION_PRIVATE_KEY=${privateKeyB64}`);
    console.log('');
    console.log(`FEDERATION_PUBLIC_KEY=${publicKeyB64}`);
    console.log('─'.repeat(60));
    console.log('\n⚠️  IMPORTANT:');
    console.log('   • Keep your PRIVATE KEY secret! Never share it or commit it.');
    console.log('   • Share your PUBLIC KEY with other chapters by adding it to');
    console.log('     network-registry.ts in the template repository.\n');
    console.log('📋 Add your chapter to src/lib/federation/network-registry.ts:');
    console.log(`
{
  slug: 'your-chapter-slug',
  name: 'La French Tech YourCity',
  apiBaseUrl: 'https://lafrenchtech-yourcity.com',
  publicKey: '${publicKeyB64.substring(0, 40)}...',
  active: true,
}
`);
  } catch (error) {
    // Check if Ed25519 is supported
    if (error instanceof Error && error.message.includes('Ed25519')) {
      console.error('❌ Ed25519 is not supported in this environment.');
      console.error('   Please use Node.js 18+ or a browser with Web Crypto support.\n');
      console.log('Alternative: Generate keys using OpenSSL:');
      console.log('  openssl genpkey -algorithm Ed25519 -out private.pem');
      console.log('  openssl pkey -in private.pem -pubout -out public.pem\n');
    } else {
      console.error('❌ Error generating keys:', error);
    }
    process.exit(1);
  }
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Run if executed directly
generateKeys();
