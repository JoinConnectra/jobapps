import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, answers, transcripts, aiAnalyses, resumes } from '@/db/schema';
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
          error: 'Valid application ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    const applicationId = parseInt(id);

    // Fetch application
    const application = await db.select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (application.length === 0) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Fetch answers with transcripts
    const applicationAnswers = await db.select()
      .from(answers)
      .where(eq(answers.applicationId, applicationId));

    const answersWithTranscripts = await Promise.all(
      applicationAnswers.map(async (answer) => {
        const transcript = await db.select()
          .from(transcripts)
          .where(eq(transcripts.answerId, answer.id))
          .limit(1);

        return {
          answer,
          transcript: transcript.length > 0 ? transcript[0] : null
        };
      })
    );

    // Fetch AI analysis
    const aiAnalysis = await db.select()
      .from(aiAnalyses)
      .where(eq(aiAnalyses.applicationId, applicationId))
      .limit(1);

    // Fetch resume
    const resume = await db.select()
      .from(resumes)
      .where(eq(resumes.applicationId, applicationId))
      .limit(1);

    return NextResponse.json({
      application: application[0],
      answers: answersWithTranscripts,
      aiAnalysis: aiAnalysis.length > 0 ? aiAnalysis[0] : null,
      resume: resume.length > 0 ? resume[0] : null
    }, { status: 200 });

  } catch (error) {
    console.error('GET application detail error:', error);
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
          error: 'Valid application ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    const applicationId = parseInt(id);

    // Check if application exists
    const existing = await db.select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { stage, source } = body;

    // Build update object with only allowed fields
    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };

    if (stage !== undefined) {
      updates.stage = stage;
    }

    if (source !== undefined) {
      updates.source = source;
    }

    // Update application
    const updated = await db.update(applications)
      .set(updates)
      .where(eq(applications.id, applicationId))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error) {
    console.error('PUT application error:', error);
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
          error: 'Valid application ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    const applicationId = parseInt(id);

    // Check if application exists
    const existing = await db.select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Delete application
    const deleted = await db.delete(applications)
      .where(eq(applications.id, applicationId))
      .returning();

    return NextResponse.json(
      { 
        message: 'Application deleted successfully',
        deleted: deleted[0]
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('DELETE application error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}