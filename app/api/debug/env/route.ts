import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
    COGNITO_REGION: process.env.COGNITO_REGION,
    AUTH_PROVIDER: process.env.AUTH_PROVIDER,
    allCognitoKeys: Object.keys(process.env).filter(k => k.startsWith('COGNITO_'))
  });
}
