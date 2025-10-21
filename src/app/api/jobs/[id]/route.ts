import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, jobQuestions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid job ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    const jobId = parseInt(id);

    // Fetch job details
    const jobResult = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (jobResult.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Fetch associated questions
    const questions = await db.select()
      .from(jobQuestions)
      .where(eq(jobQuestions.jobId, jobId))
      .orderBy(jobQuestions.orderIndex);

    // Combine job details with questions
    const jobWithQuestions = {
      ...jobResult[0],
      questions: questions
    };

    return NextResponse.json(jobWithQuestions, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid job ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    const jobId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { title, dept, locationMode, salaryRange, descriptionMd, status } = body;

    // Check if job exists
    const existingJob = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (existingJob.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Prepare update object with only provided fields
    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };

    if (title !== undefined) updates.title = title;
    if (dept !== undefined) updates.dept = dept;
    if (locationMode !== undefined) updates.locationMode = locationMode;
    if (salaryRange !== undefined) updates.salaryRange = salaryRange;
    if (descriptionMd !== undefined) updates.descriptionMd = descriptionMd;
    if (status !== undefined) updates.status = status;

    // Validate required field if provided
    if (title !== undefined && (!title || typeof title !== 'string' || title.trim().length === 0)) {
      return NextResponse.json(
        { 
          error: 'Title must be a non-empty string',
          code: 'INVALID_TITLE' 
        },
        { status: 400 }
      );
    }

    // Update job
    const updatedJob = await db.update(jobs)
      .set(updates)
      .where(eq(jobs.id, jobId))
      .returning();

    return NextResponse.json(updatedJob[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid job ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    const jobId = parseInt(id);

    // Check if job exists
    const existingJob = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (existingJob.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Delete job
    const deletedJob = await db.delete(jobs)
      .where(eq(jobs.id, jobId))
      .returning();

    return NextResponse.json(
      {
        message: 'Job deleted successfully',
        job: deletedJob[0]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}