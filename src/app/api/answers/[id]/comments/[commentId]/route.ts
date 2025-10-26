import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { answerComments, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
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
    const { id, commentId: commentIdParam } = await params;
    const commentId = parseInt(commentIdParam);
    const answerId = parseInt(id);

    if (isNaN(commentId) || isNaN(answerId)) {
      return NextResponse.json(
        { error: "Invalid comment or answer ID" },
        { status: 400 }
      );
    }

    // Check if the comment exists and belongs to the current user
    const existingComment = await db
      .select()
      .from(answerComments)
      .where(
        and(
          eq(answerComments.id, commentId),
          eq(answerComments.answerId, answerId),
          eq(answerComments.userId, dbUserId)
        )
      )
      .limit(1);

    if (existingComment.length === 0) {
      return NextResponse.json(
        { error: "Comment not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    // Delete the comment
    await db
      .delete(answerComments)
      .where(
        and(
          eq(answerComments.id, commentId),
          eq(answerComments.answerId, answerId),
          eq(answerComments.userId, dbUserId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
