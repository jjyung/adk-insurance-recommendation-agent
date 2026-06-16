import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const getBaseUrl = () =>
  process.env.FASTAPI_BASE_URL ?? 'http://127.0.0.1:8080';

type RouteParams = Promise<{
  appName: string;
  userId: string;
  sessionId: string;
}>;

// ─── GET /apps/{appName}/users/{userId}/sessions/{sessionId} ──────────────────
// Retrieve a single session.

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams },
) {
  try {
    const { appName, userId, sessionId } = await params;
    const baseUrl = getBaseUrl();
    const upstreamUrl = `${baseUrl.replace(/\/$/, '')}/apps/${encodeURIComponent(appName)}/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}`;

    const response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(request.headers.get('authorization')
          ? { Authorization: request.headers.get('authorization') as string }
          : {}),
      },
      cache: 'no-store',
    });

    if (response.status === 404) {
      return NextResponse.json({ error: 'session not found' }, { status: 404 });
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'FastAPI backend unavailable' },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'FastAPI backend unavailable' },
      { status: 502 },
    );
  }
}

// ─── DELETE /apps/{appName}/users/{userId}/sessions/{sessionId} ───────────────
// Delete a session.

export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams },
) {
  try {
    const { appName, userId, sessionId } = await params;

    if (!sessionId?.trim()) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 },
      );
    }

    const baseUrl = getBaseUrl();
    const upstreamUrl = `${baseUrl.replace(/\/$/, '')}/apps/${encodeURIComponent(appName)}/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}`;

    const response = await fetch(upstreamUrl, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(request.headers.get('authorization')
          ? { Authorization: request.headers.get('authorization') as string }
          : {}),
      },
    });

    if (response.ok || response.status === 404) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 502 },
    );
  } catch {
    return NextResponse.json(
      { error: 'FastAPI backend unavailable' },
      { status: 502 },
    );
  }
}
