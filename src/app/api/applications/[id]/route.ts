import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
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

    const { stage } = body;

    if (!stage) {
      return NextResponse.json(
        { error: 'Stage is required', code: 'MISSING_STAGE' },
        { status: 400 }
      );
    }

    // Update application
    const now = new Date().toISOString();
    const updated = await db
      .update(applications)
      .set({
        stage: stage.trim(),
        updatedAt: now,
      })
      .where(eq(applications.id, applicationId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Application not found', code: 'APPLICATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PATCH /api/applications/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
