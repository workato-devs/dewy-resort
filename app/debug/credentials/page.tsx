/**
 * Debug Credentials Page
 * 
 * Provides a UI to exfiltrate Cognito Identity Pool credentials
 * for development purposes.
 * 
 * DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION
 */

'use client';

import { useState } from 'react';

export default function DebugCredentialsPage() {
  const [credentials, setCredentials] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchCredentials = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch('/api/debug/cognito-credentials');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch credentials');
      }

      setCredentials(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (credentials?.copyPaste) {
      navigator.clipboard.writeText(credentials.copyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6">
          <div className="border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Development Only - Security Warning
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    This page exposes AWS credentials for development purposes only.
                    Never use this in production. Credentials expire after ~1 hour.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Cognito Credentials Exfiltration
          </h1>

          <p className="text-gray-600 mb-6">
            Click the button below to get AWS credentials from your Cognito Identity Pool session.
            These credentials can be used for local development and testing.
          </p>

          <button
            onClick={fetchCredentials}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Fetching Credentials...' : 'Get Credentials'}
          </button>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {credentials && (
            <div className="mt-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm text-green-800">
                  ✅ Credentials obtained successfully!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  User: {credentials.userId} | Role: {credentials.role} | Expires in: {credentials.expiresIn}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Copy to .env file:
                  </h3>
                  <button
                    onClick={copyToClipboard}
                    className="text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded"
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-3 overflow-x-auto">
                  {credentials.copyPaste}
                </pre>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Credential Details:
                </h3>
                <dl className="space-y-2 text-xs">
                  <div>
                    <dt className="font-medium text-gray-700">Access Key ID:</dt>
                    <dd className="mt-1 text-gray-600 font-mono break-all">
                      {credentials.credentials.accessKeyId}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Secret Access Key:</dt>
                    <dd className="mt-1 text-gray-600 font-mono break-all">
                      {credentials.credentials.secretAccessKey}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Session Token:</dt>
                    <dd className="mt-1 text-gray-600 font-mono break-all">
                      {credentials.credentials.sessionToken.substring(0, 100)}...
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Expires:</dt>
                    <dd className="mt-1 text-gray-600">
                      {new Date(credentials.credentials.expiration).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  Next Steps:
                </h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Copy the credentials above to your .env file</li>
                  <li>Restart the dev server: <code className="bg-blue-100 px-1 rounded">bash scripts/dev-tools/server.sh restart</code></li>
                  <li>Test Bedrock chat functionality</li>
                  <li>Credentials will expire in {credentials.expiresIn}, then repeat this process</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
