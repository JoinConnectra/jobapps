import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { activity, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, entityType, entityId, action, actorUserId, diffJson } = body;

    // Validate required fields
    if (!orgId) {
      return NextResponse.json({ 
        error: "orgId is required",
        code: "MISSING_ORG_ID" 
      }, { status: 400 });
    }

    if (!entityType) {
      return NextResponse.json({ 
        error: "entityType is required",
        code: "MISSING_ENTITY_TYPE" 
      }, { status: 400 });
    }

    if (entityId === undefined || entityId === null) {
      return NextResponse.json({ 
        error: "entityId is required",
        code: "MISSING_ENTITY_ID" 
      }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ 
        error: "action is required",
        code: "MISSING_ACTION" 
      }, { status: 400 });
    }

    // Validate types
    if (typeof orgId !== 'number' || !Number.isInteger(orgId)) {
      return NextResponse.json({ 
        error: "orgId must be an integer",
        code: "INVALID_ORG_ID" 
      }, { status: 400 });
    }

    if (typeof entityId !== 'number' || !Number.isInteger(entityId)) {
      return NextResponse.json({ 
        error: "entityId must be an integer",
        code: "INVALID_ENTITY_ID" 
      }, { status: 400 });
    }

    if (actorUserId !== undefined && actorUserId !== null) {
      if (typeof actorUserId !== 'number' || !Number.isInteger(actorUserId)) {
        return NextResponse.json({ 
          error: "actorUserId must be an integer or null",
          code: "INVALID_ACTOR_USER_ID" 
        }, { status: 400 });
      }
    }

    if (typeof entityType !== 'string' || entityType.trim() === '') {
      return NextResponse.json({ 
        error: "entityType must be a non-empty string",
        code: "INVALID_ENTITY_TYPE" 
      }, { status: 400 });
    }

    if (typeof action !== 'string' || action.trim() === '') {
      return NextResponse.json({ 
        error: "action must be a non-empty string",
        code: "INVALID_ACTION" 
      }, { status: 400 });
    }

    // Prepare insert data
    const insertData: any = {
      orgId,
      entityType: entityType.trim(),
      entityId,
      action: action.trim(),
      createdAt: new Date(),
    };

    // Add optional fields
    if (actorUserId !== undefined && actorUserId !== null) {
      insertData.actorUserId = actorUserId;
    }

    if (diffJson !== undefined && diffJson !== null) {
      insertData.diffJson = diffJson;
    }

    // Insert activity log
    const newActivity = await db.insert(activity)
      .values(insertData)
      .returning();

    return NextResponse.json(newActivity[0], { status: 201 });
  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orgIdParam = searchParams.get('orgId');
    const entityTypeParam = searchParams.get('entityType');
    const entityIdParam = searchParams.get('entityId');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Validate required orgId parameter
    if (!orgIdParam) {
      return NextResponse.json({ 
        error: "orgId query parameter is required",
        code: "MISSING_ORG_ID" 
      }, { status: 400 });
    }

    const orgId = parseInt(orgIdParam);
    if (isNaN(orgId)) {
      return NextResponse.json({ 
        error: "orgId must be a valid integer",
        code: "INVALID_ORG_ID" 
      }, { status: 400 });
    }

    // Parse pagination parameters
    const limit = Math.min(parseInt(limitParam ?? '50'), 200);
    const offset = parseInt(offsetParam ?? '0');

    // Build where conditions
    const conditions: any[] = [eq(activity.orgId, orgId)];

    // Add entityType filter if provided
    if (entityTypeParam) {
      conditions.push(eq(activity.entityType, entityTypeParam));
    }

    // Add entityId filter if provided
    if (entityIdParam) {
      const entityId = parseInt(entityIdParam);
      if (!isNaN(entityId)) {
        conditions.push(eq(activity.entityId, entityId));
      }
    }

    // Query activity logs with user join
    const results = await db.select({
      id: activity.id,
      orgId: activity.orgId,
      actorUserId: activity.actorUserId,
      actorName: users.name,
      actorEmail: users.email,
      entityType: activity.entityType,
      entityId: activity.entityId,
      action: activity.action,
      diffJson: activity.diffJson,
      createdAt: activity.createdAt,
    })
      .from(activity)
      .leftJoin(users, eq(activity.actorUserId, users.id))
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(activity.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}