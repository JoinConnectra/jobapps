import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const jobId = parseInt(id);
    
    if (isNaN(jobId)) {
      return NextResponse.json({
        error: 'Valid job ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const job = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json({
        error: 'Job not found',
        code: 'JOB_NOT_FOUND'
      }, { status: 404 });
    }

    return NextResponse.json(job[0], { status: 200 });
  } catch (error) {
    console.error('GET /api/jobs/[id] error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const jobId = parseInt(id);
    
    if (isNaN(jobId)) {
      return NextResponse.json({
        error: 'Valid job ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const body = await request.json();
    const { title, dept, locationMode, salaryRange, descriptionMd, status, visibility } = body;

    // Check if job exists
    const existingJob = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (existingJob.length === 0) {
      return NextResponse.json({
        error: 'Job not found',
        code: 'JOB_NOT_FOUND'
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (dept !== undefined) updateData.dept = dept?.trim() || null;
    if (locationMode !== undefined) updateData.locationMode = locationMode?.trim() || null;
    if (salaryRange !== undefined) updateData.salaryRange = salaryRange?.trim() || null;
    if (descriptionMd !== undefined) updateData.descriptionMd = descriptionMd?.trim() || null;
    if (status !== undefined) updateData.status = status;
    if (visibility !== undefined) updateData.visibility = visibility;

    const updatedJob = await db.update(jobs)
      .set(updateData)
      .where(eq(jobs.id, jobId))
      .returning();

    return NextResponse.json(updatedJob[0], { status: 200 });
  } catch (error) {
    console.error('PATCH /api/jobs/[id] error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const jobId = parseInt(id);
    
    if (isNaN(jobId)) {
      return NextResponse.json({
        error: 'Valid job ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    // Check if job exists
    const existingJob = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (existingJob.length === 0) {
      return NextResponse.json({
        error: 'Job not found',
        code: 'JOB_NOT_FOUND'
      }, { status: 404 });
    }

    // Delete the job
    await db.delete(jobs)
      .where(eq(jobs.id, jobId));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/jobs/[id] error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}