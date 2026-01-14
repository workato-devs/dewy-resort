/**
 * Okta User Registration Test Endpoint
 * Runs the test-user-registration.js script and returns results
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  const startTime = Date.now();
  
  try {
    const { stdout, stderr } = await execAsync('node scripts/test-user-registration.js', {
      timeout: 30000,
    });

    const output = stdout + stderr;
    
    const passedMatch = output.match(/Automated Passed: (\d+)/);
    const failedMatch = output.match(/Automated Failed: (\d+)/);
    const manualMatch = output.match(/Manual Tests: (\d+)/);
    const totalMatch = output.match(/Total Tests: (\d+)/);
    
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    const manual = manualMatch ? parseInt(manualMatch[1]) : 0;
    const total = totalMatch ? parseInt(totalMatch[1]) : passed + failed + manual;
    
    const success = failed === 0;
    const duration = Date.now() - startTime;

    const results: Array<{ test: string; passed: boolean; warning?: string; duration: number }> = [];
    const testLines = output.split('\n').filter(line => 
      line.includes('✓ PASS') || line.includes('✗ FAIL') || line.includes('⚠ MANUAL')
    );

    testLines.forEach(line => {
      const isPassed = line.includes('✓ PASS');
      const isManual = line.includes('⚠ MANUAL');
      const testName = line.replace(/.*(?:✓ PASS|✗ FAIL|⚠ MANUAL):\s*/, '').trim();
      
      if (testName) {
        results.push({
          test: testName,
          passed: isPassed,
          warning: isManual ? 'Manual verification required' : undefined,
          duration: Math.floor(duration / testLines.length),
        });
      }
    });

    return NextResponse.json({
      success,
      message: success ? 'All automated registration tests passed!' : 'Some registration tests failed',
      summary: {
        total,
        passed,
        failed,
        duration,
      },
      results,
      warnings: [`${manual} tests require manual verification`],
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      message: 'User registration tests failed to run',
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
    });
  }
}
