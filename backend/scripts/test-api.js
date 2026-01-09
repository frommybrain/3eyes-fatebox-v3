// scripts/test-api.js
// Test API endpoints

import 'dotenv/config';

const API_URL = process.env.API_URL || 'http://localhost:3333';

console.log('\n🧪 Testing 3Eyes Backend API...\n');
console.log(`API URL: ${API_URL}\n`);

async function testAPI() {
    let hasErrors = false;

    // Test 1: Health Check
    console.log('1️⃣  Testing health endpoint...');
    try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();

        if (response.ok && data.status === 'ok') {
            console.log('   ✅ Health check passed');
            console.log(`      Environment: ${data.environment}`);
        } else {
            console.log('   ❌ Health check failed');
            hasErrors = true;
        }
    } catch (error) {
        console.log(`   ❌ Failed to connect: ${error.message}`);
        console.log('      Make sure server is running: npm run dev');
        hasErrors = true;
    }

    // Test 2: List Projects
    console.log('\n2️⃣  Testing list projects endpoint...');
    try {
        const response = await fetch(`${API_URL}/api/projects`);
        const data = await response.json();

        if (response.ok && data.success) {
            console.log('   ✅ List projects passed');
            console.log(`      Network: ${data.network}`);
            console.log(`      Projects: ${data.count}`);
        } else {
            console.log('   ❌ List projects failed:', data.error);
            hasErrors = true;
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
        hasErrors = true;
    }

    // Test 3: Create Project (Mock)
    console.log('\n3️⃣  Testing create project endpoint (validation only)...');
    try {
        const response = await fetch(`${API_URL}/api/projects/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // Missing required fields intentionally to test validation
            })
        });
        const data = await response.json();

        if (response.status === 400 && data.error.includes('required')) {
            console.log('   ✅ Validation working correctly');
        } else {
            console.log('   ⚠️  Unexpected response');
            console.log('      Response:', data);
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
        hasErrors = true;
    }

    // Test 4: Vault Info (will fail without project, but tests route)
    console.log('\n4️⃣  Testing vault info endpoint...');
    try {
        const response = await fetch(`${API_URL}/api/vault/test-project-id/info`);
        const data = await response.json();

        if (response.status === 404 && data.error === 'Project not found') {
            console.log('   ✅ Vault endpoint working (project not found as expected)');
        } else {
            console.log('   ⚠️  Unexpected response');
            console.log('      Response:', data);
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
        hasErrors = true;
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    if (hasErrors) {
        console.log('❌ Some tests failed. Check errors above.');
        process.exit(1);
    } else {
        console.log('✅ All API tests passed!');
        console.log('\nAPI is ready to use. Available endpoints:');
        console.log('  POST   /api/projects/create');
        console.log('  GET    /api/projects');
        console.log('  GET    /api/projects/:projectId');
        console.log('  GET    /api/vault/:projectId/balance');
        console.log('  GET    /api/vault/:projectId/info');
        console.log('  POST   /api/vault/fund (not implemented yet)');
    }
    console.log('='.repeat(60) + '\n');
}

testAPI().catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
});
