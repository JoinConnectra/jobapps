import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { answers, applications, jobQuestions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const applicationId = formData.get('applicationId') as string;
    const questionId = formData.get('questionId') as string;
    const durationSec = formData.get('durationSec') as string;

    if (!audioFile || !applicationId || !questionId) {
      return NextResponse.json(
        {
          error: 'Audio file, applicationId, and questionId are required',
          code: 'MISSING_FIELDS',
        },
        { status: 400 }
      );
    }

    const appId = parseInt(applicationId);
    const qId = parseInt(questionId);
    const duration = parseInt(durationSec || '0');

    if (isNaN(appId) || isNaN(qId)) {
      return NextResponse.json(
        { error: 'Invalid IDs', code: 'INVALID_IDS' },
        { status: 400 }
      );
    }

    // Verify application exists
    const application = await db
      .select()
      .from(applications)
      .where(eq(applications.id, appId))
      .limit(1);

    if (application.length === 0) {
      return NextResponse.json(
        { error: 'Application not found', code: 'APPLICATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify question exists
    const question = await db
      .select()
      .from(jobQuestions)
      .where(eq(jobQuestions.id, qId))
      .limit(1);

    if (question.length === 0) {
      return NextResponse.json(
        { error: 'Question not found', code: 'QUESTION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // For now, we'll store a mock S3 key
    // In production, upload to actual cloud storage (Supabase, S3, etc.)
    const mockS3Key = `answers/${appId}/${qId}/${Date.now()}.webm`;

    const now = new Date().toISOString();
    const newAnswer = await db
      .insert(answers)
      .values({
        applicationId: appId,
        questionId: qId,
        audioS3Key: mockS3Key,
        durationSec: duration,
        createdAt: now,
      })
      .returning();

    return NextResponse.json(newAnswer[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/answers error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json(
        { error: 'applicationId is required', code: 'MISSING_APPLICATION_ID' },
        { status: 400 }
      );
    }

    const appId = parseInt(applicationId);
    if (isNaN(appId)) {
      return NextResponse.json(
        { error: 'Invalid application ID', code: 'INVALID_APPLICATION_ID' },
        { status: 400 }
      );
    }

    const answersList = await db
      .select()
      .from(answers)
      .where(eq(answers.applicationId, appId));

    return NextResponse.json(answersList, { status: 200 });
  } catch (error) {
    console.error('GET /api/answers error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
