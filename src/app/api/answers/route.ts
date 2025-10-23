import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { answers, applications, jobQuestions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Accept both multipart (voice) and JSON (text)
    const contentType = request.headers.get('content-type') || '';
    let audioFile: File | null = null;
    let textAnswer: string | null = null;
    let applicationId: string;
    let questionId: string;
    let durationSec: string = '0';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      audioFile = formData.get('audio') as File;
      applicationId = String(formData.get('applicationId'));
      questionId = String(formData.get('questionId'));
      durationSec = String(formData.get('durationSec') || '0');
      textAnswer = null;
    } else {
      const body = await request.json();
      applicationId = String(body.applicationId);
      questionId = String(body.questionId);
      textAnswer = body.textAnswer ?? null;
      durationSec = String(body.durationSec ?? '0');
    }

    if ((!audioFile && !textAnswer) || !applicationId || !questionId) {
      return NextResponse.json(
        { error: 'Answer payload, applicationId, and questionId are required', code: 'MISSING_FIELDS' },
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

    // For now, we'll store a mock S3 key for audio
    const mockS3Key = audioFile ? `answers/${appId}/${qId}/${Date.now()}.webm` : null;

    const now = new Date();
    const newAnswer = await db
      .insert(answers)
      .values({
        applicationId: appId,
        questionId: qId,
        audioS3Key: mockS3Key,
        durationSec: duration,
        textAnswer: textAnswer,
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
