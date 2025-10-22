import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { answerReactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { reaction, userId } = await request.json();
    
    if (!reaction || !userId) {
      return NextResponse.json(
        { error: "Reaction and userId are required" },
        { status: 400 }
      );
    }

    if (!["like", "dislike"].includes(reaction)) {
      return NextResponse.json(
        { error: "Reaction must be 'like' or 'dislike'" },
        { status: 400 }
      );
    }

    // Check if user already reacted to this answer
    const existingReaction = await db
      .select()
      .from(answerReactions)
      .where(
        and(
          eq(answerReactions.answerId, parseInt(params.id)),
          eq(answerReactions.userId, userId)
        )
      )
      .limit(1);

    if (existingReaction.length > 0) {
      // Update existing reaction
      await db
        .update(answerReactions)
        .set({ reaction })
        .where(
          and(
            eq(answerReactions.answerId, parseInt(params.id)),
            eq(answerReactions.userId, userId)
          )
        );
    } else {
      // Create new reaction
      await db.insert(answerReactions).values({
        answerId: parseInt(params.id),
        userId,
        reaction,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating reaction:", error);
    return NextResponse.json(
      { error: "Failed to create reaction" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: "UserId is required" },
        { status: 400 }
      );
    }

    await db
      .delete(answerReactions)
      .where(
        and(
          eq(answerReactions.answerId, parseInt(params.id)),
          eq(answerReactions.userId, userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reaction:", error);
    return NextResponse.json(
      { error: "Failed to delete reaction" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reactions = await db
      .select()
      .from(answerReactions)
      .where(eq(answerReactions.answerId, parseInt(params.id)));

    return NextResponse.json(reactions);
  } catch (error) {
    console.error("Error fetching reactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch reactions" },
      { status: 500 }
    );
  }
}
