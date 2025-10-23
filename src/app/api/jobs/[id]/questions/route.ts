import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobQuestions, jobs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const jobId = parseInt(id);

    if (isNaN(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID', code: 'INVALID_JOB_ID' },
        { status: 400 }
      );
    }

    // Verify job exists
    const job = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get all questions for this job
    const questions = await db.select()
      .from(jobQuestions)
      .where(eq(jobQuestions.jobId, jobId))
      .orderBy(jobQuestions.orderIndex);

    return NextResponse.json(questions, { status: 200 });
  } catch (error) {
    console.error('GET /api/jobs/[id]/questions error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const jobId = parseInt(id);
    const body = await request.json();

    if (isNaN(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID', code: 'INVALID_JOB_ID' },
        { status: 400 }
      );
    }

    const { prompt, maxSec, required, orderIndex, kind, maxChars } = body;

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Question prompt is required', code: 'MISSING_PROMPT' },
        { status: 400 }
      );
    }

    // Verify job exists
    const job = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 404 }
      );
    }

    const now = new Date();
    const newQuestion = await db.insert(jobQuestions)
      .values({
        jobId,
        prompt: prompt.trim(),
        kind: (kind === 'text' || kind === 'voice') ? kind : 'voice',
        maxSec: maxSec || 120,
        maxChars: maxChars || null,
        required: required !== undefined ? required : true,
        orderIndex: orderIndex !== undefined ? orderIndex : 0,
        createdAt: now,
      })
      .returning();

    return NextResponse.json(newQuestion[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/jobs/[id]/questions error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
