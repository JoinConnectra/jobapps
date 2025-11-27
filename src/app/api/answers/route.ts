import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { answers, applications, jobQuestions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Accept both multipart (voice) and JSON (text/yesno)
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
        {
          error:
            'Answer payload, applicationId, and questionId are required',
          code: 'MISSING_FIELDS',
        },
        { status: 400 }
      );
    }

    const appId = parseInt(applicationId);
    const qId = parseInt(questionId);

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
        {
          error: 'Application not found',
          code: 'APPLICATION_NOT_FOUND',
        },
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

    const q = question[0];

    // Validate & normalize based on question kind
    // kind can be 'voice' | 'text' | 'yesno'
    const kind = (q as any).kind as 'voice' | 'text' | 'yesno' | undefined;

    if (kind === 'voice') {
      // Voice answer MUST have audio; text is ignored
      if (!audioFile) {
        return NextResponse.json(
          {
            error: 'Audio file is required for a voice question',
            code: 'AUDIO_REQUIRED',
          },
          { status: 400 }
        );
      }
    } else {
      // Text / yes-no answers MUST have text; audio is optional/ignored
      if (!textAnswer || textAnswer.trim() === '') {
        return NextResponse.json(
          {
            error: 'Text answer is required for this question',
            code: 'TEXT_REQUIRED',
          },
          { status: 400 }
        );
      }

      if (kind === 'yesno') {
        // Normalize yes/no to a clean "yes" or "no"
        const raw = textAnswer.trim().toLowerCase();
        if (
          ![
            'yes',
            'no',
            'y',
            'n',
            'true',
            'false',
            '1',
            '0',
          ].includes(raw)
        ) {
          return NextResponse.json(
            {
              error:
                'Invalid yes/no answer; expected yes or no value',
              code: 'INVALID_YESNO',
            },
            { status: 400 }
          );
        }

        const normalizedYes =
          raw === 'yes' ||
          raw === 'y' ||
          raw === 'true' ||
          raw === '1';
        textAnswer = normalizedYes ? 'yes' : 'no';
      }
    }

    // For voice answers, store actual duration; otherwise 0
    const duration =
      kind === 'voice'
        ? parseInt(durationSec || '0', 10) || 0
        : 0;

    // Upload the actual audio file and get the URL (voice only)
    let audioUrl: string | null = null;
    if (audioFile) {
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('audio', audioFile);
        uploadFormData.append('applicationId', appId.toString());
        uploadFormData.append('questionId', qId.toString());
        uploadFormData.append('durationSec', String(duration));

        const uploadResponse = await fetch(
          `${
            process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
          }/api/audio/upload`,
          {
            method: 'POST',
            body: uploadFormData,
          }
        );

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          audioUrl = uploadResult.audioUrl;
        } else {
          console.error(
            'Audio upload failed:',
            await uploadResponse.text()
          );
        }
      } catch (uploadError) {
        console.error('Audio upload error:', uploadError);
      }
    }

    const now = new Date();
    const newAnswer = await db
      .insert(answers)
      .values({
        applicationId: appId,
        questionId: qId,
        audioS3Key: audioUrl, // Store the actual audio URL (if any)
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
        {
          error: 'applicationId is required',
          code: 'MISSING_APPLICATION_ID',
        },
        { status: 400 }
      );
    }

    const appId = parseInt(applicationId);
    if (isNaN(appId)) {
      return NextResponse.json(
        {
          error: 'Invalid application ID',
          code: 'INVALID_APPLICATION_ID',
        },
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
