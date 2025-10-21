import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { commentThreads, comments, users } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

const ALLOWED_ANCHOR_TYPES = ['transcript', 'summary', 'resume'] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, anchorType, createdBy, anchorPayload } = body;

    // Validate required fields
    if (!applicationId) {
      return NextResponse.json(
        { error: 'applicationId is required', code: 'MISSING_APPLICATION_ID' },
        { status: 400 }
      );
    }

    if (!anchorType) {
      return NextResponse.json(
        { error: 'anchorType is required', code: 'MISSING_ANCHOR_TYPE' },
        { status: 400 }
      );
    }

    if (!createdBy) {
      return NextResponse.json(
        { error: 'createdBy is required', code: 'MISSING_CREATED_BY' },
        { status: 400 }
      );
    }

    // Validate applicationId is a number
    if (isNaN(parseInt(String(applicationId)))) {
      return NextResponse.json(
        { error: 'applicationId must be a valid integer', code: 'INVALID_APPLICATION_ID' },
        { status: 400 }
      );
    }

    // Validate createdBy is a number
    if (isNaN(parseInt(String(createdBy)))) {
      return NextResponse.json(
        { error: 'createdBy must be a valid integer', code: 'INVALID_CREATED_BY' },
        { status: 400 }
      );
    }

    // Validate anchorType enum
    if (!ALLOWED_ANCHOR_TYPES.includes(anchorType)) {
      return NextResponse.json(
        {
          error: `anchorType must be one of: ${ALLOWED_ANCHOR_TYPES.join(', ')}`,
          code: 'INVALID_ANCHOR_TYPE',
        },
        { status: 400 }
      );
    }

    // Create the comment thread
    const newThread = await db
      .insert(commentThreads)
      .values({
        applicationId: parseInt(String(applicationId)),
        anchorType,
        anchorPayload: anchorPayload || null,
        createdBy: parseInt(String(createdBy)),
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newThread[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const applicationId = searchParams.get('applicationId');

    // Single thread with all comments
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid id is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const threadId = parseInt(id);

      // Get the thread
      const thread = await db
        .select()
        .from(commentThreads)
        .where(eq(commentThreads.id, threadId))
        .limit(1);

      if (thread.length === 0) {
        return NextResponse.json(
          { error: 'Comment thread not found', code: 'THREAD_NOT_FOUND' },
          { status: 404 }
        );
      }

      // Get all comments with user information
      const threadComments = await db
        .select({
          id: comments.id,
          threadId: comments.threadId,
          bodyMd: comments.bodyMd,
          createdBy: comments.createdBy,
          resolvedBy: comments.resolvedBy,
          resolvedAt: comments.resolvedAt,
          createdAt: comments.createdAt,
          userName: users.name,
          userEmail: users.email,
          userAvatarUrl: users.avatarUrl,
        })
        .from(comments)
        .leftJoin(users, eq(comments.createdBy, users.id))
        .where(eq(comments.threadId, threadId))
        .orderBy(asc(comments.createdAt));

      return NextResponse.json(
        {
          ...thread[0],
          comments: threadComments,
        },
        { status: 200 }
      );
    }

    // List threads by application with comment counts
    if (applicationId) {
      if (isNaN(parseInt(applicationId))) {
        return NextResponse.json(
          { error: 'Valid applicationId is required', code: 'INVALID_APPLICATION_ID' },
          { status: 400 }
        );
      }

      const appId = parseInt(applicationId);

      // Get all threads for the application
      const threads = await db
        .select()
        .from(commentThreads)
        .where(eq(commentThreads.applicationId, appId))
        .orderBy(asc(commentThreads.createdAt));

      // Get comment counts for each thread
      const threadsWithCounts = await Promise.all(
        threads.map(async (thread) => {
          const commentCount = await db
            .select()
            .from(comments)
            .where(eq(comments.threadId, thread.id));

          return {
            ...thread,
            commentCount: commentCount.length,
          };
        })
      );

      return NextResponse.json(threadsWithCounts, { status: 200 });
    }

    // Missing required parameter
    return NextResponse.json(
      { error: 'Either id or applicationId parameter is required', code: 'MISSING_PARAMETER' },
      { status: 400 }
    );
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}