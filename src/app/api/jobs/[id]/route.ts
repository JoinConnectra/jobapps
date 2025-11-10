import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, organizations } from '@/db/schema-pg';
import { eq } from 'drizzle-orm';

/**
 * GET /api/jobs/:id
 * - For students (public access): only return if job is published and visibility is public|both
 * - For employer/internal views you can still query /api/jobs?id=... with orgId to bypass this,
 *   but this detail route is used by the student portal.
 */
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

    // Join organization so the student page can show org name and website
    const row = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        dept: jobs.dept,
        locationMode: jobs.locationMode,
        salaryRange: jobs.salaryRange,
        descriptionMd: jobs.descriptionMd,
        status: jobs.status,
        visibility: jobs.visibility,
        orgId: jobs.orgId,
        orgName: organizations.name,
        orgWebsite: organizations.link,

        /** NEW fields */
        location: jobs.location,
        seniority: jobs.seniority,
        skillsCsv: jobs.skillsCsv,
      })
      .from(jobs)
      .leftJoin(organizations, eq(organizations.id, jobs.orgId))
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (row.length === 0) {
      return NextResponse.json({
        error: 'Job not found',
        code: 'JOB_NOT_FOUND'
      }, { status: 404 });
    }

    const j = row[0];

    // Enforce public visibility for student detail
    const isPublished = j.status === 'published';
    const isPublic = j.visibility === 'public' || j.visibility === 'both';
    if (!(isPublished && isPublic)) {
      return NextResponse.json({
        error: 'Job not found',
        code: 'JOB_NOT_FOUND'
      }, { status: 404 });
    }

    return NextResponse.json(
      {
        id: j.id,
        title: j.title,
        descriptionHtml: null, // (you can render from descriptionMd later)
        location: j.location || null,  // NEW: wire through
        locationMode: j.locationMode,
        seniority: j.seniority || null,
        skillsCsv: j.skillsCsv || null,

        organization: j.orgName ? {
          name: j.orgName,
          website: j.orgWebsite || null
        } : null,

        // keep extras you were exposing
        orgName: j.orgName,
        orgWebsite: j.orgWebsite || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/jobs/[id] error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

/**
 * PATCH /api/jobs/:id
 * (keeps your logic; enables updates for new fields)
 */
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
    const {
      title,
      dept,
      locationMode,
      salaryRange,
      descriptionMd,
      status,
      visibility,

      /** NEW optional updatable fields */
      location,
      seniority,
      skillsCsv,
    } = body;

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

    if (title !== undefined) updateData.title = title?.trim();
    if (dept !== undefined) updateData.dept = dept?.trim() || null;
    if (locationMode !== undefined) updateData.locationMode = locationMode?.trim() || null;
    if (salaryRange !== undefined) updateData.salaryRange = salaryRange?.trim() || null;
    if (descriptionMd !== undefined) updateData.descriptionMd = descriptionMd?.trim() || null;
    if (status !== undefined) updateData.status = status;
    if (visibility !== undefined) updateData.visibility = visibility;

    /** NEW fields */
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (seniority !== undefined) updateData.seniority = seniority?.trim() || null;
    if (skillsCsv !== undefined) updateData.skillsCsv = skillsCsv?.trim() || null;

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

/**
 * DELETE /api/jobs/:id
 * (unchanged)
 */
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

    await db.delete(jobs).where(eq(jobs.id, jobId));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/jobs/[id] error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}
