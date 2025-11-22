/**
 * Browser Console Script - Get ID Token
 * 
 * Instructions:
 * 1. Open your browser to http://localhost:3000
 * 2. Make sure you're logged in
 * 3. Open Developer Tools (F12)
 * 4. Go to Console tab
 * 5. Paste this entire script and press Enter
 * 6. Copy the ID token that appears
 * 7. Run: export TEST_ID_TOKEN="<paste-token-here>"
 * 8. Run: node scripts/test-bedrock-simple.js
 */

(async function getIdToken() {
  try {
    const response = await fetch('/api/debug/session-tokens');
    const data = await response.json();
    
    if (data.idToken) {
      console.log('✅ ID Token found!');
      console.log('\nCopy this command and run it in your terminal:\n');
      console.log(`export TEST_ID_TOKEN="${data.idToken}"`);
      console.log('\nThen run: node scripts/test-bedrock-simple.js\n');
      
      // Also show some info
      console.log('Token Info:');
      console.log('  User ID:', data.userId);
      console.log('  Role:', data.role);
      console.log('  Token Length:', data.idTokenLength);
      
      if (data.claims) {
        console.log('  Email:', data.claims.email);
        console.log('  Expires:', new Date(data.claims.exp * 1000).toLocaleString());
      }
      
      return data.idToken;
    } else {
      console.error('❌ No ID token found');
      console.log('Message:', data.message);
      console.log('\nPlease log out and log back in to get a fresh token.');
    }
  } catch (error) {
    console.error('❌ Error fetching token:', error);
    console.log('\nMake sure you are logged in and the server is running.');
  }
})();
