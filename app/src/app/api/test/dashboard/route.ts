/**
 * Test Dashboard - Pretty Printed Test Results
 * Displays all test results in a formatted HTML view
 * Access via: GET /api/test/dashboard
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workato Integration Test Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .header h1 {
      color: #2d3748;
      font-size: 32px;
      margin-bottom: 10px;
    }

    .header p {
      color: #718096;
      font-size: 16px;
    }

    .test-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .test-card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }

    .test-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
    }

    .test-card.loading {
      opacity: 0.6;
      pointer-events: none;
    }

    .test-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .test-title {
      font-size: 20px;
      font-weight: 600;
      color: #2d3748;
    }

    .test-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-mock {
      background: #e6fffa;
      color: #047857;
    }

    .badge-real {
      background: #fef3c7;
      color: #92400e;
    }

    .test-description {
      color: #718096;
      font-size: 14px;
      margin-bottom: 20px;
      line-height: 1.5;
    }

    .test-stats {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
    }

    .stat {
      flex: 1;
      text-align: center;
      padding: 10px;
      background: #f7fafc;
      border-radius: 8px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 12px;
      color: #718096;
      text-transform: uppercase;
    }

    .stat-value.success { color: #10b981; }
    .stat-value.error { color: #ef4444; }
    .stat-value.neutral { color: #6366f1; }

    .run-button {
      width: 100%;
      padding: 12px;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .run-button:hover {
      background: #4f46e5;
    }

    .run-button:disabled {
      background: #cbd5e0;
      cursor: not-allowed;
    }

    .results-section {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      display: none;
    }

    .results-section.visible {
      display: block;
    }

    .result-item {
      padding: 15px;
      border-left: 4px solid #e2e8f0;
      margin-bottom: 15px;
      background: #f7fafc;
      border-radius: 4px;
    }

    .result-item.passed {
      border-left-color: #10b981;
      background: #f0fdf4;
    }

    .result-item.failed {
      border-left-color: #ef4444;
      background: #fef2f2;
    }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .result-name {
      font-weight: 600;
      color: #2d3748;
    }

    .result-duration {
      font-size: 12px;
      color: #718096;
    }

    .result-details {
      font-size: 13px;
      color: #4a5568;
      margin-top: 8px;
    }

    .result-error {
      color: #dc2626;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      margin-top: 8px;
      padding: 8px;
      background: #fee2e2;
      border-radius: 4px;
    }

    .warning-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    .warning-box h3 {
      color: #92400e;
      font-size: 16px;
      margin-bottom: 8px;
    }

    .warning-box ul {
      list-style: none;
      color: #78350f;
      font-size: 14px;
    }

    .warning-box li {
      margin-bottom: 4px;
    }

    .warning-box li:before {
      content: "⚠️ ";
      margin-right: 8px;
    }

    .spinner {
      border: 3px solid #f3f4f6;
      border-top: 3px solid #6366f1;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .status-icon {
      font-size: 20px;
      margin-right: 8px;
    }

    .footer {
      text-align: center;
      color: white;
      margin-top: 30px;
      font-size: 14px;
    }

    .refresh-button {
      background: white;
      color: #6366f1;
      border: 2px solid white;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
      transition: all 0.2s;
    }

    .refresh-button:hover {
      background: #6366f1;
      color: white;
    }

    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 Integration Test Dashboard</h1>
      <p>Run and view all integration tests in one place - Workato, Salesforce, and Okta</p>
    </div>

    <div class="test-grid">
      <!-- Workato Mock Tests Card -->
      <div class="test-card" id="unit-test-card">
        <div class="test-header">
          <div class="test-title">🔧 Workato Mock Tests</div>
          <div class="test-badge badge-mock">Mock Mode</div>
        </div>
        <div class="test-description">
          Tests Workato mock functions. Fast and safe for development.
        </div>
        <div class="test-stats">
          <div class="stat">
            <div class="stat-value neutral" id="unit-total">-</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat">
            <div class="stat-value success" id="unit-passed">-</div>
            <div class="stat-label">Passed</div>
          </div>
          <div class="stat">
            <div class="stat-value error" id="unit-failed">-</div>
            <div class="stat-label">Failed</div>
          </div>
        </div>
        <button class="run-button" onclick="runTest('unit')">Run Mock Tests</button>
      </div>

      <!-- Workato Workflow Tests Card -->
      <div class="test-card" id="workflow-test-card">
        <div class="test-header">
          <div class="test-title">🔄 Workato Workflows</div>
          <div class="test-badge badge-mock">Mock Mode</div>
        </div>
        <div class="test-description">
          Tests complete Workato workflows with mocked dependencies.
        </div>
        <div class="test-stats">
          <div class="stat">
            <div class="stat-value neutral" id="workflow-total">-</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat">
            <div class="stat-value success" id="workflow-passed">-</div>
            <div class="stat-label">Passed</div>
          </div>
          <div class="stat">
            <div class="stat-value error" id="workflow-failed">-</div>
            <div class="stat-label">Failed</div>
          </div>
        </div>
        <button class="run-button" onclick="runTest('workflow')">Run Workflow Tests</button>
      </div>

      <!-- Salesforce Real API Tests Card -->
      <div class="test-card" id="api-test-card">
        <div class="test-header">
          <div class="test-title">☁️ Salesforce API</div>
          <div class="test-badge badge-real">Real API</div>
        </div>
        <div class="test-description">
          Tests actual Workato/Salesforce integration. Creates real data. Use with caution.
        </div>
        <div class="test-stats">
          <div class="stat">
            <div class="stat-value neutral" id="api-total">-</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat">
            <div class="stat-value success" id="api-passed">-</div>
            <div class="stat-label">Passed</div>
          </div>
          <div class="stat">
            <div class="stat-value error" id="api-failed">-</div>
            <div class="stat-label">Failed</div>
          </div>
        </div>
        <button class="run-button" onclick="runTest('api')">Run API Tests</button>
      </div>

      <!-- Okta OAuth Tests Card -->
      <div class="test-card" id="okta-oauth-test-card">
        <div class="test-header">
          <div class="test-title">🔐 Okta OAuth Flow</div>
          <div class="test-badge badge-real">Real API</div>
        </div>
        <div class="test-description">
          Tests Okta OAuth 2.0 flow, PKCE, user upsert, and session management.
        </div>
        <div class="test-stats">
          <div class="stat">
            <div class="stat-value neutral" id="okta-oauth-total">-</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat">
            <div class="stat-value success" id="okta-oauth-passed">-</div>
            <div class="stat-label">Passed</div>
          </div>
          <div class="stat">
            <div class="stat-value error" id="okta-oauth-failed">-</div>
            <div class="stat-label">Failed</div>
          </div>
        </div>
        <button class="run-button" onclick="runTest('okta-oauth')">Run OAuth Tests</button>
      </div>

      <!-- Okta Mock Mode Tests Card -->
      <div class="test-card" id="okta-mock-test-card">
        <div class="test-header">
          <div class="test-title">🔒 Okta Mock Mode</div>
          <div class="test-badge badge-mock">Mock Mode</div>
        </div>
        <div class="test-description">
          Tests local authentication when Okta is disabled (mock mode).
        </div>
        <div class="test-stats">
          <div class="stat">
            <div class="stat-value neutral" id="okta-mock-total">-</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat">
            <div class="stat-value success" id="okta-mock-passed">-</div>
            <div class="stat-label">Passed</div>
          </div>
          <div class="stat">
            <div class="stat-value error" id="okta-mock-failed">-</div>
            <div class="stat-label">Failed</div>
          </div>
        </div>
        <button class="run-button" onclick="runTest('okta-mock')">Run Mock Tests</button>
      </div>

      <!-- Okta Error Scenarios Card -->
      <div class="test-card" id="okta-errors-test-card">
        <div class="test-header">
          <div class="test-title">⚠️ Okta Error Handling</div>
          <div class="test-badge badge-mock">Automated</div>
        </div>
        <div class="test-description">
          Tests error handling, logging, and error classes in Okta integration.
        </div>
        <div class="test-stats">
          <div class="stat">
            <div class="stat-value neutral" id="okta-errors-total">-</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat">
            <div class="stat-value success" id="okta-errors-passed">-</div>
            <div class="stat-label">Passed</div>
          </div>
          <div class="stat">
            <div class="stat-value error" id="okta-errors-failed">-</div>
            <div class="stat-label">Failed</div>
          </div>
        </div>
        <button class="run-button" onclick="runTest('okta-errors')">Run Error Tests</button>
      </div>

      <!-- Okta Session Management Card -->
      <div class="test-card" id="okta-sessions-test-card">
        <div class="test-header">
          <div class="test-title">🎫 Okta Sessions</div>
          <div class="test-badge badge-mock">Automated</div>
        </div>
        <div class="test-description">
          Tests session creation, validation, expiration, and security.
        </div>
        <div class="test-stats">
          <div class="stat">
            <div class="stat-value neutral" id="okta-sessions-total">-</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat">
            <div class="stat-value success" id="okta-sessions-passed">-</div>
            <div class="stat-label">Passed</div>
          </div>
          <div class="stat">
            <div class="stat-value error" id="okta-sessions-failed">-</div>
            <div class="stat-label">Failed</div>
          </div>
        </div>
        <button class="run-button" onclick="runTest('okta-sessions')">Run Session Tests</button>
      </div>

      <!-- Okta User Registration Card -->
      <div class="test-card" id="okta-registration-test-card">
        <div class="test-header">
          <div class="test-title">👤 Okta Registration</div>
          <div class="test-badge badge-mock">Automated</div>
        </div>
        <div class="test-description">
          Tests user registration, password validation, and duplicate handling.
        </div>
        <div class="test-stats">
          <div class="stat">
            <div class="stat-value neutral" id="okta-registration-total">-</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat">
            <div class="stat-value success" id="okta-registration-passed">-</div>
            <div class="stat-label">Passed</div>
          </div>
          <div class="stat">
            <div class="stat-value error" id="okta-registration-failed">-</div>
            <div class="stat-label">Failed</div>
          </div>
        </div>
        <button class="run-button" onclick="runTest('okta-registration')">Run Registration Tests</button>
      </div>
    </div>

    <!-- Results Section -->
    <div class="results-section" id="results-section">
      <h2 style="margin-bottom: 20px; color: #2d3748;">Test Results</h2>
      <div id="results-content"></div>
    </div>

    <div class="footer">
      <p>Integration Testing Suite - Workato, Salesforce, and Okta</p>
      <button class="refresh-button" onclick="location.reload()">Refresh Dashboard</button>
    </div>
  </div>

  <script>
    async function runTest(type) {
      const endpoints = {
        unit: '/api/test/mock-mode',
        workflow: '/api/test/integration',
        api: '/api/test/real-api',
        'okta-oauth': '/api/test/okta/oauth-flow',
        'okta-mock': '/api/test/okta/mock-mode',
        'okta-errors': '/api/test/okta/error-scenarios',
        'okta-sessions': '/api/test/okta/session-management',
        'okta-registration': '/api/test/okta/user-registration'
      };

      const cardId = type + '-test-card';
      const card = document.getElementById(cardId);
      const resultsSection = document.getElementById('results-section');
      const resultsContent = document.getElementById('results-content');

      // Show loading state
      card.classList.add('loading');
      card.querySelector('.run-button').disabled = true;
      card.querySelector('.run-button').textContent = 'Running...';

      // Show results section
      resultsSection.classList.add('visible');
      resultsContent.innerHTML = '<div class="spinner"></div>';

      try {
        const response = await fetch(endpoints[type]);
        const data = await response.json();

        // Update stats
        document.getElementById(type + '-total').textContent = data.summary?.total || 0;
        document.getElementById(type + '-passed').textContent = data.summary?.passed || 0;
        document.getElementById(type + '-failed').textContent = data.summary?.failed || 0;

        // Display results
        displayResults(data, type);

      } catch (error) {
        resultsContent.innerHTML = \`
          <div class="result-item failed">
            <div class="result-header">
              <div class="result-name">❌ Error Running Tests</div>
            </div>
            <div class="result-error">\${error.message}</div>
          </div>
        \`;
      } finally {
        // Remove loading state
        card.classList.remove('loading');
        card.querySelector('.run-button').disabled = false;
        card.querySelector('.run-button').textContent = 'Run Again';
      }
    }

    function displayResults(data, type) {
      const resultsContent = document.getElementById('results-content');
      
      let html = '';

      // Add warnings for real API tests
      if (type === 'api' && data.warnings) {
        html += \`
          <div class="warning-box">
            <h3>⚠️ Important Warnings</h3>
            <ul>
              \${data.warnings.map(w => \`<li>\${w}</li>\`).join('')}
            </ul>
          </div>
        \`;
      }

      // Add summary
      html += \`
        <div style="background: \${data.success ? '#f0fdf4' : '#fef2f2'}; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid \${data.success ? '#10b981' : '#ef4444'};">
          <h3 style="color: #2d3748; margin-bottom: 10px;">
            <span class="status-icon">\${data.success ? '✅' : '❌'}</span>
            \${data.message}
          </h3>
          <div style="display: flex; gap: 20px; font-size: 14px; color: #4a5568;">
            <div><strong>Total:</strong> \${data.summary.total}</div>
            <div><strong>Passed:</strong> <span style="color: #10b981;">\${data.summary.passed}</span></div>
            <div><strong>Failed:</strong> <span style="color: #ef4444;">\${data.summary.failed}</span></div>
            <div><strong>Duration:</strong> \${data.summary.duration}ms</div>
          </div>
        </div>
      \`;

      // Add individual test results
      if (data.results && data.results.length > 0) {
        html += '<h3 style="margin-bottom: 15px; color: #2d3748;">Individual Test Results</h3>';
        
        data.results.forEach(result => {
          html += \`
            <div class="result-item \${result.passed ? 'passed' : 'failed'}">
              <div class="result-header">
                <div class="result-name">
                  <span class="status-icon">\${result.passed ? '✅' : '❌'}</span>
                  \${result.test}
                </div>
                <div class="result-duration">\${result.duration}ms</div>
              </div>
              \${result.error ? \`<div class="result-error">\${result.error}</div>\` : ''}
              \${result.warning ? \`<div class="result-details" style="color: #f59e0b;">⚠️ \${result.warning}</div>\` : ''}
              \${result.details ? \`
                <details style="margin-top: 10px;">
                  <summary style="cursor: pointer; color: #6366f1; font-size: 13px;">View Details</summary>
                  <pre>\${JSON.stringify(result.details, null, 2)}</pre>
                </details>
              \` : ''}
            </div>
          \`;
        });
      }

      // Add environment info for real API tests
      if (type === 'api' && data.environment) {
        html += \`
          <details style="margin-top: 20px;">
            <summary style="cursor: pointer; color: #6366f1; font-weight: 600;">Environment Information</summary>
            <pre>\${JSON.stringify(data.environment, null, 2)}</pre>
          </details>
        \`;
      }

      resultsContent.innerHTML = html;
    }

    // Auto-run unit tests on load
    window.addEventListener('load', () => {
      setTimeout(() => runTest('unit'), 500);
    });
  </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
