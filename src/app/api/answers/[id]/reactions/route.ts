import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { answerReactions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { reaction, userId } = await request.json();
    
    console.log('Reaction API called:', {
      answerId: params.id,
      reaction,
      userId,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      method: request.method
    });

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
    console.log('Database user ID:', dbUserId);

    // Test database connection
    try {
      console.log('Testing database connection...');
      await db.select().from(answerReactions).limit(1);
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      throw dbError;
    }
    
    if (!reaction) {
      console.error('Missing required fields:', { reaction });
      return NextResponse.json(
        { error: "Reaction is required" },
        { status: 400 }
      );
    }

    if (!["like", "dislike"].includes(reaction)) {
      console.error('Invalid reaction:', reaction);
      return NextResponse.json(
        { error: "Reaction must be 'like' or 'dislike'" },
        { status: 400 }
      );
    }

    // Check if user already reacted to this answer
    console.log('Checking for existing reaction...');
    const existingReaction = await db
      .select()
      .from(answerReactions)
      .where(
        and(
          eq(answerReactions.answerId, parseInt(params.id)),
          eq(answerReactions.userId, dbUserId)
        )
      )
      .limit(1);

    console.log('Existing reaction found:', existingReaction.length > 0);

    if (existingReaction.length > 0) {
      // Update existing reaction
      console.log('Updating existing reaction...');
      await db
        .update(answerReactions)
        .set({ reaction })
        .where(
          and(
            eq(answerReactions.answerId, parseInt(params.id)),
            eq(answerReactions.userId, dbUserId)
          )
        );
    } else {
      // Create new reaction
      console.log('Creating new reaction...');
      await db.insert(answerReactions).values({
        answerId: parseInt(params.id),
        userId: dbUserId,
        reaction,
        createdAt: new Date(),
      });
    }

    console.log('Reaction saved successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating reaction:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { error: "Failed to create reaction", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    await db
      .delete(answerReactions)
      .where(
        and(
          eq(answerReactions.answerId, parseInt(params.id)),
          eq(answerReactions.userId, dbUserId)
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
