import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { comments, users, commentThreads } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { threadId, bodyMd, createdBy } = body;

    // Validate required fields
    if (!threadId) {
      return NextResponse.json(
        { error: 'threadId is required', code: 'MISSING_THREAD_ID' },
        { status: 400 }
      );
    }

    if (!bodyMd || typeof bodyMd !== 'string' || bodyMd.trim().length === 0) {
      return NextResponse.json(
        { error: 'bodyMd is required and must be a non-empty string', code: 'MISSING_BODY_MD' },
        { status: 400 }
      );
    }

    if (!createdBy) {
      return NextResponse.json(
        { error: 'createdBy is required', code: 'MISSING_CREATED_BY' },
        { status: 400 }
      );
    }

    // Validate threadId is a valid integer
    const threadIdInt = parseInt(threadId);
    if (isNaN(threadIdInt)) {
      return NextResponse.json(
        { error: 'threadId must be a valid integer', code: 'INVALID_THREAD_ID' },
        { status: 400 }
      );
    }

    // Validate createdBy is a valid integer
    const createdByInt = parseInt(createdBy);
    if (isNaN(createdByInt)) {
      return NextResponse.json(
        { error: 'createdBy must be a valid integer', code: 'INVALID_CREATED_BY' },
        { status: 400 }
      );
    }

    // Check if thread exists
    const thread = await db
      .select()
      .from(commentThreads)
      .where(eq(commentThreads.id, threadIdInt))
      .limit(1);

    if (thread.length === 0) {
      return NextResponse.json(
        { error: 'Comment thread not found', code: 'THREAD_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, createdByInt))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Create the comment
    const newComment = await db
      .insert(comments)
      .values({
        threadId: threadIdInt,
        bodyMd: bodyMd.trim(),
        createdBy: createdByInt,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newComment[0], { status: 201 });
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
    const threadId = searchParams.get('threadId');

    // Validate threadId is provided
    if (!threadId) {
      return NextResponse.json(
        { error: 'threadId query parameter is required', code: 'MISSING_THREAD_ID' },
        { status: 400 }
      );
    }

    // Validate threadId is a valid integer
    const threadIdInt = parseInt(threadId);
    if (isNaN(threadIdInt)) {
      return NextResponse.json(
        { error: 'threadId must be a valid integer', code: 'INVALID_THREAD_ID' },
        { status: 400 }
      );
    }

    // Get comments with user information
    const results = await db
      .select({
        id: comments.id,
        threadId: comments.threadId,
        bodyMd: comments.bodyMd,
        createdBy: comments.createdBy,
        resolvedBy: comments.resolvedBy,
        resolvedAt: comments.resolvedAt,
        createdAt: comments.createdAt,
        createdByUser: {
          id: users.id,
          email: users.email,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.createdBy, users.id))
      .where(eq(comments.threadId, threadIdInt))
      .orderBy(asc(comments.createdAt));

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID is provided
    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required', code: 'MISSING_ID' },
        { status: 400 }
      );
    }

    // Validate ID is a valid integer
    const commentId = parseInt(id);
    if (isNaN(commentId)) {
      return NextResponse.json(
        { error: 'id must be a valid integer', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { resolvedBy, resolved } = body;

    // Validate resolved is a boolean
    if (typeof resolved !== 'boolean') {
      return NextResponse.json(
        { error: 'resolved must be a boolean', code: 'INVALID_RESOLVED' },
        { status: 400 }
      );
    }

    // Check if comment exists
    const existingComment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (existingComment.length === 0) {
      return NextResponse.json(
        { error: 'Comment not found', code: 'COMMENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    let updateData: {
      resolvedBy: number | null;
      resolvedAt: string | null;
    };

    if (resolved) {
      // Validate resolvedBy when resolving
      if (!resolvedBy) {
        return NextResponse.json(
          { error: 'resolvedBy is required when resolving a comment', code: 'MISSING_RESOLVED_BY' },
          { status: 400 }
        );
      }

      const resolvedByInt = parseInt(resolvedBy);
      if (isNaN(resolvedByInt)) {
        return NextResponse.json(
          { error: 'resolvedBy must be a valid integer', code: 'INVALID_RESOLVED_BY' },
          { status: 400 }
        );
      }

      // Check if user exists
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, resolvedByInt))
        .limit(1);

      if (user.length === 0) {
        return NextResponse.json(
          { error: 'User not found', code: 'USER_NOT_FOUND' },
          { status: 400 }
        );
      }

      updateData = {
        resolvedBy: resolvedByInt,
        resolvedAt: new Date().toISOString(),
      };
    } else {
      // Unresolving the comment
      updateData = {
        resolvedBy: null,
        resolvedAt: null,
      };
    }

    // Update the comment
    const updatedComment = await db
      .update(comments)
      .set(updateData)
      .where(eq(comments.id, commentId))
      .returning();

    return NextResponse.json(updatedComment[0], { status: 200 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}