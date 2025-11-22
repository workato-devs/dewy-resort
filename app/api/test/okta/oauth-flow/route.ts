/**
 * Okta OAuth Flow Test Endpoint
 * Runs the test-okta-oauth-flow.js script and returns results
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Run the test script
    const { stdout, stderr } = await execAsync('node scripts/test-okta-oauth-flow.js', {
      timeout: 30000, // 30 second timeout
    });

    // Parse the output to extract test results
    const output = stdout + stderr;
    
    // Extract test counts from output
    const passedMatch = output.match(/Passed: (\d+)/);
    const failedMatch = output.match(/Failed: (\d+)/);
    const totalMatch = output.match(/Total Tests: (\d+)/);
    
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    const total = totalMatch ? parseInt(totalMatch[1]) : passed + failed;
    
    const success = failed === 0;
    const duration = Date.now() - startTime;

    // Parse individual test results
    const results: Array<{ test: string; passed: boolean; duration: number }> = [];
    const testLines = output.split('\n').filter(line => 
      line.includes('✓ PASS') || line.includes('✗ FAIL')
    );

    testLines.forEach(line => {
      const isPassed = line.includes('✓ PASS');
      const testName = line.replace(/.*(?:✓ PASS|✗ FAIL):\s*/, '').trim();
      
      if (testName) {
        results.push({
          test: testName,
          passed: isPassed,
          duration: Math.floor(duration / testLines.length),
        });
      }
    });

    return NextResponse.json({
      success,
      message: success ? 'All Okta OAuth tests passed!' : 'Some Okta OAuth tests failed',
      summary: {
        total,
        passed,
        failed,
        duration,
      },
      results,
      output: output.substring(0, 5000), // Limit output size
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      message: 'Okta OAuth tests failed to run',
      summary: {
        total: 0,
        passed: 0,
        failed: 1,
        duration,
      },
      results: [{
        test: 'Test Execution',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      }],
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
