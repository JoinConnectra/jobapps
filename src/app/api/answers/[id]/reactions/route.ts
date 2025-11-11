import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { answerReactions, answers, applications, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { reaction, explanation } = await request.json();

    const answerId = parseInt(params.id, 10);
    if (Number.isNaN(answerId)) {
      return NextResponse.json({ error: "Invalid answer ID" }, { status: 400 });
    }

    const trimmedExplanation = (explanation ?? "").toString().trim();

    // Get the actual database user ID from the session
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Get the database user ID by looking up the user by email
    const userResult = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json({ error: "User not found in database" }, { status: 401 });
    }

    const dbUserId = userResult[0].id;

    if (!reaction) {
      return NextResponse.json({ error: "Reaction is required" }, { status: 400 });
    }

    if (!["like", "dislike"].includes(reaction)) {
      return NextResponse.json({ error: "Reaction must be 'like' or 'dislike'" }, { status: 400 });
    }

    if (!trimmedExplanation) {
      return NextResponse.json({ error: "Explanation is required" }, { status: 400 });
    }

    const [answerRecord] = await db
      .select({
        applicationId: answers.applicationId,
      })
      .from(answers)
      .where(eq(answers.id, answerId))
      .limit(1);

    if (!answerRecord) {
      return NextResponse.json({ error: "Answer not found" }, { status: 404 });
    }

    const applicationId = answerRecord.applicationId;

    const [applicationRecord] = await db
      .select({
        jobId: applications.jobId,
      })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (!applicationRecord) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const jobId = applicationRecord.jobId;

    // Check if user already reacted to this answer
    const existingReaction = await db
      .select()
      .from(answerReactions)
      .where(
        and(
          eq(answerReactions.answerId, answerId),
          eq(answerReactions.userId, dbUserId),
          eq(answerReactions.applicationId, applicationId)
        )
      )
      .limit(1);

    let reactionId: number;
    if (existingReaction.length > 0) {
      // Update existing reaction
      const [updated] = await db
        .update(answerReactions)
        .set({
          reaction,
          explanation: trimmedExplanation,
          jobId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(answerReactions.answerId, answerId),
            eq(answerReactions.userId, dbUserId),
            eq(answerReactions.applicationId, applicationId)
          )
        )
        .returning({ id: answerReactions.id });
      reactionId = updated.id;
    } else {
      // Create new reaction
      const [inserted] = await db
        .insert(answerReactions)
        .values({
          answerId,
          applicationId,
          jobId,
          userId: dbUserId,
          reaction,
          explanation: trimmedExplanation,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: answerReactions.id });
      reactionId = inserted.id;
    }

    const [reactionRow] = await db
      .select({
        id: answerReactions.id,
        answerId: answerReactions.answerId,
        applicationId: answerReactions.applicationId,
        jobId: answerReactions.jobId,
        userId: answerReactions.userId,
        reaction: answerReactions.reaction,
        explanation: answerReactions.explanation,
        createdAt: answerReactions.createdAt,
        updatedAt: answerReactions.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(answerReactions)
      .innerJoin(users, eq(answerReactions.userId, users.id))
      .where(eq(answerReactions.id, reactionId))
      .limit(1);

    return NextResponse.json({ success: true, reaction: reactionRow });
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const answerId = parseInt(id, 10);
    if (Number.isNaN(answerId)) {
      return NextResponse.json({ error: "Invalid answer ID" }, { status: 400 });
    }

    const applicationIdParam = request.nextUrl.searchParams.get("applicationId");
    const jobIdParam = request.nextUrl.searchParams.get("jobId");

    const filters = [
      eq(answerReactions.answerId, answerId),
    ];

    if (applicationIdParam) {
      const appId = parseInt(applicationIdParam, 10);
      if (!Number.isNaN(appId)) {
        filters.push(eq(answerReactions.applicationId, appId));
      }
    }

    if (jobIdParam) {
      const jobId = parseInt(jobIdParam, 10);
      if (!Number.isNaN(jobId)) {
        filters.push(eq(answerReactions.jobId, jobId));
      }
    }

    const whereClause = filters.length === 1 ? filters[0] : and(...filters);

    const reactions = await db
      .select({
        id: answerReactions.id,
        answerId: answerReactions.answerId,
        applicationId: answerReactions.applicationId,
        jobId: answerReactions.jobId,
        userId: answerReactions.userId,
        reaction: answerReactions.reaction,
        explanation: answerReactions.explanation,
        createdAt: answerReactions.createdAt,
        updatedAt: answerReactions.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(answerReactions)
      .innerJoin(users, eq(answerReactions.userId, users.id))
      .where(whereClause)
      .orderBy(desc(answerReactions.updatedAt), desc(answerReactions.createdAt));

    return NextResponse.json(reactions);
  } catch (error) {
    console.error("Error fetching reactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch reactions" },
      { status: 500 }
    );
  }
}
