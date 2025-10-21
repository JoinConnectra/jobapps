import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { answers, transcripts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, questionId, audioS3Key, durationSec } = body;

    // Validate required fields
    if (!applicationId) {
      return NextResponse.json({
        error: 'applicationId is required',
        code: 'MISSING_APPLICATION_ID'
      }, { status: 400 });
    }

    if (!questionId) {
      return NextResponse.json({
        error: 'questionId is required',
        code: 'MISSING_QUESTION_ID'
      }, { status: 400 });
    }

    // Validate applicationId is a valid integer
    if (isNaN(parseInt(String(applicationId)))) {
      return NextResponse.json({
        error: 'applicationId must be a valid integer',
        code: 'INVALID_APPLICATION_ID'
      }, { status: 400 });
    }

    // Validate questionId is a valid integer
    if (isNaN(parseInt(String(questionId)))) {
      return NextResponse.json({
        error: 'questionId must be a valid integer',
        code: 'INVALID_QUESTION_ID'
      }, { status: 400 });
    }

    // Validate durationSec if provided
    if (durationSec !== undefined && durationSec !== null && isNaN(parseInt(String(durationSec)))) {
      return NextResponse.json({
        error: 'durationSec must be a valid integer',
        code: 'INVALID_DURATION'
      }, { status: 400 });
    }

    // Prepare insert data
    const insertData: {
      applicationId: number;
      questionId: number;
      audioS3Key?: string;
      durationSec?: number;
      createdAt: string;
    } = {
      applicationId: parseInt(String(applicationId)),
      questionId: parseInt(String(questionId)),
      createdAt: new Date().toISOString()
    };

    if (audioS3Key) {
      insertData.audioS3Key = String(audioS3Key).trim();
    }

    if (durationSec !== undefined && durationSec !== null) {
      insertData.durationSec = parseInt(String(durationSec));
    }

    // Insert answer
    const newAnswer = await db.insert(answers)
      .values(insertData)
      .returning();

    if (newAnswer.length === 0) {
      return NextResponse.json({
        error: 'Failed to create answer',
        code: 'CREATE_FAILED'
      }, { status: 500 });
    }

    return NextResponse.json(newAnswer[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const applicationId = searchParams.get('applicationId');
    const questionId = searchParams.get('questionId');

    // If id is provided, fetch single answer with transcript
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json({
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        }, { status: 400 });
      }

      const answerId = parseInt(id);

      // Fetch answer
      const answer = await db.select()
        .from(answers)
        .where(eq(answers.id, answerId))
        .limit(1);

      if (answer.length === 0) {
        return NextResponse.json({
          error: 'Answer not found',
          code: 'ANSWER_NOT_FOUND'
        }, { status: 404 });
      }

      // Fetch transcript if exists
      const transcript = await db.select()
        .from(transcripts)
        .where(eq(transcripts.answerId, answerId))
        .limit(1);

      // Construct response with transcript
      const response = {
        ...answer[0],
        transcript: transcript.length > 0 ? transcript[0] : null
      };

      return NextResponse.json(response, { status: 200 });
    }

    // List answers with filters
    // At least one filter must be provided
    if (!applicationId && !questionId) {
      return NextResponse.json({
        error: 'At least one filter parameter (applicationId or questionId) is required',
        code: 'MISSING_FILTER'
      }, { status: 400 });
    }

    // Build filter conditions
    const conditions = [];

    if (applicationId) {
      if (isNaN(parseInt(applicationId))) {
        return NextResponse.json({
          error: 'applicationId must be a valid integer',
          code: 'INVALID_APPLICATION_ID'
        }, { status: 400 });
      }
      conditions.push(eq(answers.applicationId, parseInt(applicationId)));
    }

    if (questionId) {
      if (isNaN(parseInt(questionId))) {
        return NextResponse.json({
          error: 'questionId must be a valid integer',
          code: 'INVALID_QUESTION_ID'
        }, { status: 400 });
      }
      conditions.push(eq(answers.questionId, parseInt(questionId)));
    }

    // Execute query with filters
    const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
    const results = await db.select()
      .from(answers)
      .where(whereCondition);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}