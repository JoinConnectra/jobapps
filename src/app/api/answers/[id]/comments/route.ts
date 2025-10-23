import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { answerComments, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { comment, userId } = await request.json();
    
    if (!comment || !userId) {
      return NextResponse.json(
        { error: "Comment and userId are required" },
        { status: 400 }
      );
    }

    const result = await db.insert(answerComments).values({
      answerId: parseInt(params.id),
      userId,
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
  { params }: { params: { id: string } }
) {
  try {
    const comments = await db
      .select({
        id: answerComments.id,
        comment: answerComments.comment,
        createdAt: answerComments.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(answerComments)
      .leftJoin(users, eq(answerComments.userId, users.id))
      .where(eq(answerComments.answerId, parseInt(params.id)))
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
