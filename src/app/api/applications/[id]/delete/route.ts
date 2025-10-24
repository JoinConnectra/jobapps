import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, answers, answerReactions, answerComments, actions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = parseInt(params.id);
    
    if (isNaN(applicationId)) {
      return NextResponse.json(
        { error: 'Invalid application ID' },
        { status: 400 }
      );
    }

    // Get the application to verify it exists
    const application = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (application.length === 0) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Delete related data in the correct order (due to foreign key constraints)
    // 1. Delete answer reactions
    await db
      .delete(answerReactions)
      .where(eq(answerReactions.answerId, applicationId));

    // 2. Delete answer comments
    await db
      .delete(answerComments)
      .where(eq(answerComments.answerId, applicationId));

    // 3. Delete answers
    await db
      .delete(answers)
      .where(eq(answers.applicationId, applicationId));

    // 4. Delete actions
    await db
      .delete(actions)
      .where(eq(actions.applicationId, applicationId));

    // 5. Finally delete the application
    await db
      .delete(applications)
      .where(eq(applications.id, applicationId));

    return NextResponse.json(
      { success: true, message: 'Application deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('DELETE /api/applications/[id]/delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    );
  }
}
