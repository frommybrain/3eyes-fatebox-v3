// test-anchor-program.js
// Test if Anchor program loads correctly

import 'dotenv/config';
import { getAnchorProgram } from './lib/anchorClient.js';

async function testAnchorProgram() {
    console.log('\n🧪 Testing Anchor Program Loading\n');

    try {
        const { program, programId } = await getAnchorProgram();

        console.log('✅ Program loaded successfully!');
        console.log(`   Program ID: ${programId.toString()}`);
        console.log(`   Methods available:`, Object.keys(program.methods || {}));
        console.log(`   IDL name:`, program.idl.name);
        console.log(`   Instructions:`, program.idl.instructions.map(i => i.name));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testAnchorProgram();
