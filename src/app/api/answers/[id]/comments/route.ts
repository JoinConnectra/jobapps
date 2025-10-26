import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { answerComments, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { comment } = await request.json();
    
    if (!comment) {
      return NextResponse.json(
        { error: "Comment is required" },
        { status: 400 }
      );
    }

    // Get the actual database user ID from the session
    const { auth } = await import('@/lib/auth');
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Get the database user ID by looking up the user by email
    const userResult = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 401 }
      );
    }

    const dbUserId = userResult[0].id;

    const result = await db.insert(answerComments).values({
      answerId: parseInt(params.id),
      userId: dbUserId,
      comment,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const comments = await db
      .select({
        id: answerComments.id,
        answerId: answerComments.answerId,
        userId: answerComments.userId,
        comment: answerComments.comment,
        createdAt: answerComments.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(answerComments)
      .leftJoin(users, eq(answerComments.userId, users.id))
      .where(eq(answerComments.answerId, parseInt((await params).id)))
      .orderBy(desc(answerComments.createdAt));

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
