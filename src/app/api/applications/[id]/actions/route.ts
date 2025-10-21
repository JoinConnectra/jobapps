import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { actions, applications, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

const ALLOWED_ACTION_TYPES = ['reject', 'move_to_phone', 'email_sent', 'exported'] as const;
type ActionType = typeof ALLOWED_ACTION_TYPES[number];

const STAGE_MAPPING: Record<ActionType, string | null> = {
  'reject': 'rejected',
  'move_to_phone': 'phone_interview',
  'email_sent': null,
  'exported': null
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const applicationId = parseInt(id);

    if (!applicationId || isNaN(applicationId)) {
      return NextResponse.json(
        { error: 'Valid application ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { type, createdBy, payload } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: 'Action type is required', code: 'MISSING_TYPE' },
        { status: 400 }
      );
    }

    if (!createdBy) {
      return NextResponse.json(
        { error: 'CreatedBy is required', code: 'MISSING_CREATED_BY' },
        { status: 400 }
      );
    }

    // Validate action type
    if (!ALLOWED_ACTION_TYPES.includes(type)) {
      return NextResponse.json(
        { 
          error: `Invalid action type. Must be one of: ${ALLOWED_ACTION_TYPES.join(', ')}`, 
          code: 'INVALID_ACTION_TYPE' 
        },
        { status: 400 }
      );
    }

    // Check if application exists
    const existingApplication = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (existingApplication.length === 0) {
      return NextResponse.json(
        { error: 'Application not found', code: 'APPLICATION_NOT_FOUND' },
        { status: 400 }
      );
    }

    const currentTimestamp = new Date().toISOString();

    // Create action
    const newAction = await db
      .insert(actions)
      .values({
        applicationId,
        type,
        payload: payload || null,
        createdBy,
        createdAt: currentTimestamp
      })
      .returning();

    // Update application stage if applicable
    const newStage = STAGE_MAPPING[type as ActionType];
    let updatedApplication = existingApplication[0];

    if (newStage) {
      const updated = await db
        .update(applications)
        .set({
          stage: newStage,
          updatedAt: currentTimestamp
        })
        .where(eq(applications.id, applicationId))
        .returning();

      updatedApplication = updated[0];
    } else {
      // Still update the updatedAt timestamp
      const updated = await db
        .update(applications)
        .set({
          updatedAt: currentTimestamp
        })
        .where(eq(applications.id, applicationId))
        .returning();

      updatedApplication = updated[0];
    }

    return NextResponse.json(
      {
        action: newAction[0],
        applicationStage: updatedApplication.stage
      },
      { status: 201 }
    );

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

    if (!applicationId || isNaN(applicationId)) {
      return NextResponse.json(
        { error: 'Valid application ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if application exists
    const existingApplication = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (existingApplication.length === 0) {
      return NextResponse.json(
        { error: 'Application not found', code: 'APPLICATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get all actions for the application with user info
    const actionsList = await db
      .select({
        id: actions.id,
        applicationId: actions.applicationId,
        type: actions.type,
        payload: actions.payload,
        createdBy: actions.createdBy,
        createdAt: actions.createdAt,
        createdByUser: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl
        }
      })
      .from(actions)
      .leftJoin(users, eq(actions.createdBy, users.id))
      .where(eq(actions.applicationId, applicationId))
      .orderBy(desc(actions.createdAt));

    return NextResponse.json(actionsList, { status: 200 });

  } catch (error) {
    console.error('GET /api/applications/[id]/actions error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}