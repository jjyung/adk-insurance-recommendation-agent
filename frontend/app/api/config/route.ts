import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    // Server-side Node environment can dynamically read injected env vars at runtime
    backendUrl: process.env.NEXT_PUBLIC_API_URL || process.env.FASTAPI_BASE_URL || '',
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'app',
  });
}
