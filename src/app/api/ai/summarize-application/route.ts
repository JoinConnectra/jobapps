import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { aiAnalyses, applications, answers, transcripts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, regenerate } = body;

    // Validate required fields
    if (!applicationId) {
      return NextResponse.json(
        { 
          error: 'Application ID is required',
          code: 'MISSING_APPLICATION_ID'
        },
        { status: 400 }
      );
    }

    // Validate applicationId is a valid integer
    const appId = parseInt(applicationId);
    if (isNaN(appId)) {
      return NextResponse.json(
        { 
          error: 'Valid application ID is required',
          code: 'INVALID_APPLICATION_ID'
        },
        { status: 400 }
      );
    }

    // Check if application exists
    const existingApplication = await db
      .select()
      .from(applications)
      .where(eq(applications.id, appId))
      .limit(1);

    if (existingApplication.length === 0) {
      return NextResponse.json(
        { 
          error: 'Application not found',
          code: 'APPLICATION_NOT_FOUND'
        },
        { status: 400 }
      );
    }

    // Check if analysis already exists (unless regenerate=true)
    if (!regenerate) {
      const existingAnalysis = await db
        .select()
        .from(aiAnalyses)
        .where(eq(aiAnalyses.applicationId, appId))
        .limit(1);

      if (existingAnalysis.length > 0) {
        return NextResponse.json(existingAnalysis[0], { status: 200 });
      }
    }

    // Fetch application with answers and transcripts
    const applicationAnswers = await db
      .select()
      .from(answers)
      .where(eq(answers.applicationId, appId));

    // Fetch all transcripts for the answers
    const transcriptTexts: string[] = [];
    let totalWords = 0;

    for (const answer of applicationAnswers) {
      const answerTranscripts = await db
        .select()
        .from(transcripts)
        .where(eq(transcripts.answerId, answer.id));

      for (const transcript of answerTranscripts) {
        transcriptTexts.push(transcript.text);
        totalWords += transcript.text.split(/\s+/).length;
      }
    }

    // Generate mock analysis
    const mockStrengths = [
      'Clear and articulate communication skills',
      'Relevant experience in the field',
      'Strong technical knowledge demonstrated',
      'Good problem-solving approach',
      'Professional demeanor and presentation'
    ].slice(0, 3 + Math.floor(Math.random() * 3)); // 3-5 strengths

    const mockConcerns = [
      'Limited experience in specific domain areas',
      'Could benefit from more detailed examples',
      'Some areas require further clarification'
    ].slice(0, 2 + Math.floor(Math.random() * 2)); // 2-3 concerns

    const mockMatchScore = 60 + Math.floor(Math.random() * 36); // 60-95

    const transcriptCount = transcriptTexts.length;
    const hasTranscripts = transcriptCount > 0;

    const mockSummaryMd = hasTranscripts
      ? `## Application Overview

The candidate has provided ${transcriptCount} video response${transcriptCount !== 1 ? 's' : ''} with approximately ${totalWords} words total. Their responses demonstrate a solid understanding of the role requirements and showcase relevant experience.

### Communication Assessment

The applicant communicates clearly and professionally throughout their responses. They provide structured answers that address the questions directly while offering concrete examples from their background.

### Overall Impression

Based on the application materials and video responses, the candidate shows strong potential for this position. Their experience aligns well with the job requirements, though there are some areas where additional clarification or development would be beneficial.`
      : `## Application Overview

The candidate has submitted their application for review. Initial assessment indicates relevant background and qualifications for the position.

### Profile Assessment

Based on the application materials provided, the candidate demonstrates baseline qualifications for the role. Further evaluation through interview stages would help assess cultural fit and technical depth.

### Overall Impression

This application shows promise and warrants consideration for next steps in the interview process. Additional information gathering would help form a more complete assessment.`;

    const mockModelMeta = {
      model: 'mock-gpt-4',
      timestamp: new Date().toISOString(),
      transcriptCount,
      totalWords,
      version: '1.0.0'
    };

    // Save to aiAnalyses table
    const newAnalysis = await db
      .insert(aiAnalyses)
      .values({
        applicationId: appId,
        summaryMd: mockSummaryMd,
        strengths: mockStrengths,
        concerns: mockConcerns,
        matchScore: mockMatchScore,
        modelMeta: mockModelMeta,
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newAnalysis[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}