import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobQuestions, jobs } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    // Validate job ID
    if (!jobId || isNaN(parseInt(jobId))) {
      return NextResponse.json(
        { 
          error: 'Valid job ID is required',
          code: 'INVALID_JOB_ID' 
        },
        { status: 400 }
      );
    }

    // Check if job exists
    const job = await db.select()
      .from(jobs)
      .where(eq(jobs.id, parseInt(jobId)))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json(
        { 
          error: 'Job not found',
          code: 'JOB_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const orderBy = searchParams.get('orderBy');

    // Build query
    let query = db.select()
      .from(jobQuestions)
      .where(eq(jobQuestions.jobId, parseInt(jobId)));

    // Apply ordering if specified
    if (orderBy === 'orderIndex') {
      query = query.orderBy(asc(jobQuestions.orderIndex));
    }

    const questions = await query;

    return NextResponse.json(questions, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    // Validate job ID
    if (!jobId || isNaN(parseInt(jobId))) {
      return NextResponse.json(
        { 
          error: 'Valid job ID is required',
          code: 'INVALID_JOB_ID' 
        },
        { status: 400 }
      );
    }

    // Check if job exists
    const job = await db.select()
      .from(jobs)
      .where(eq(jobs.id, parseInt(jobId)))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json(
        { 
          error: 'Job not found',
          code: 'JOB_NOT_FOUND' 
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const isBatch = Array.isArray(body);
    const questionsData = isBatch ? body : [body];

    // Validate all questions
    for (const questionData of questionsData) {
      if (!questionData.prompt || typeof questionData.prompt !== 'string' || questionData.prompt.trim() === '') {
        return NextResponse.json(
          { 
            error: 'Prompt is required and must be a non-empty string',
            code: 'MISSING_REQUIRED_FIELD' 
          },
          { status: 400 }
        );
      }
    }

    // Prepare questions for insertion
    const questionsToInsert = questionsData.map((questionData) => ({
      jobId: parseInt(jobId),
      prompt: questionData.prompt.trim(),
      maxSec: questionData.maxSec !== undefined ? questionData.maxSec : 120,
      required: questionData.required !== undefined ? questionData.required : true,
      orderIndex: questionData.orderIndex !== undefined ? questionData.orderIndex : null,
      createdAt: new Date().toISOString(),
    }));

    // Insert questions
    const createdQuestions = await db.insert(jobQuestions)
      .values(questionsToInsert)
      .returning();

    // Return single object or array based on input
    const response = isBatch ? createdQuestions : createdQuestions[0];

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}