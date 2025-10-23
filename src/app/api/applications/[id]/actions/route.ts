import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { actions, applications } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const applicationId = parseInt(id);
    const body = await request.json();

    if (isNaN(applicationId)) {
      return NextResponse.json(
        { error: 'Invalid application ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const { type, payload, createdBy } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Action type is required', code: 'MISSING_TYPE' },
        { status: 400 }
      );
    }

    // Verify application exists
    const application = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (application.length === 0) {
      return NextResponse.json(
        { error: 'Application not found', code: 'APPLICATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    const now = new Date();
    const newAction = await db
      .insert(actions)
      .values({
        applicationId,
        type: type.trim(),
        payload: payload || null,
        createdBy: createdBy || null,
        createdAt: now,
      })
      .returning();

    return NextResponse.json(newAction[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/applications/[id]/actions error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const applicationId = parseInt(id);

    if (isNaN(applicationId)) {
      return NextResponse.json(
        { error: 'Invalid application ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const actionsList = await db
      .select()
      .from(actions)
      .where(eq(actions.applicationId, applicationId));

    return NextResponse.json(actionsList, { status: 200 });
  } catch (error) {
    console.error('GET /api/applications/[id]/actions error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
