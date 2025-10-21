import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jdVersions, jobs } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface GenerateJDRequest {
  jobId: number;
  prompt: string;
  createdBy?: number;
}

function generateMockJD(jobTitle: string, prompt: string): string {
  const promptLower = prompt.toLowerCase();
  
  // Extract keywords for customization
  const isSenior = promptLower.includes('senior') || promptLower.includes('lead');
  const isRemote = promptLower.includes('remote') || promptLower.includes('hybrid');
  const isDeveloper = promptLower.includes('developer') || promptLower.includes('engineer');
  const isDesigner = promptLower.includes('designer') || promptLower.includes('design');
  const isMarketing = promptLower.includes('marketing') || promptLower.includes('content');
  
  // Generate Overview
  const seniorityLevel = isSenior ? 'experienced' : 'talented';
  const locationText = isRemote ? 'remote-friendly' : 'dynamic';
  const overview = `# Overview\n\nWe are seeking a ${seniorityLevel} **${jobTitle}** to join our ${locationText} team. This role offers an exciting opportunity to work on challenging projects and contribute to our company's growth. You will collaborate with cross-functional teams to deliver high-quality results and drive innovation.\n`;
  
  // Generate Responsibilities
  let responsibilities = '# Key Responsibilities\n\n';
  if (isDeveloper) {
    responsibilities += `- Design, develop, and maintain scalable software applications\n`;
    responsibilities += `- Write clean, efficient, and well-documented code\n`;
    responsibilities += `- Collaborate with product managers and designers to implement features\n`;
    responsibilities += `- Participate in code reviews and technical discussions\n`;
    responsibilities += `- Troubleshoot and debug production issues\n`;
  } else if (isDesigner) {
    responsibilities += `- Create engaging and user-friendly design solutions\n`;
    responsibilities += `- Develop wireframes, prototypes, and high-fidelity mockups\n`;
    responsibilities += `- Collaborate with developers to ensure design implementation\n`;
    responsibilities += `- Conduct user research and usability testing\n`;
    responsibilities += `- Maintain design systems and style guides\n`;
  } else if (isMarketing) {
    responsibilities += `- Develop and execute marketing campaigns across multiple channels\n`;
    responsibilities += `- Create compelling content for various platforms\n`;
    responsibilities += `- Analyze campaign performance and optimize strategies\n`;
    responsibilities += `- Manage social media presence and engagement\n`;
    responsibilities += `- Collaborate with sales and product teams\n`;
  } else {
    responsibilities += `- Lead and execute key projects aligned with business objectives\n`;
    responsibilities += `- Collaborate with team members across departments\n`;
    responsibilities += `- Analyze data and provide actionable insights\n`;
    responsibilities += `- Maintain high standards of quality and efficiency\n`;
    responsibilities += `- Contribute to process improvements and innovation\n`;
  }
  
  // Generate Requirements
  let requirements = '\n# Requirements\n\n';
  const experienceYears = isSenior ? '5+' : '2-3';
  requirements += `- ${experienceYears} years of relevant professional experience\n`;
  
  if (isDeveloper) {
    requirements += `- Strong proficiency in modern programming languages and frameworks\n`;
    requirements += `- Experience with version control systems (Git)\n`;
    requirements += `- Understanding of software development best practices\n`;
    requirements += `- Bachelor's degree in Computer Science or related field\n`;
  } else if (isDesigner) {
    requirements += `- Proficiency in design tools (Figma, Adobe Creative Suite)\n`;
    requirements += `- Strong portfolio demonstrating design expertise\n`;
    requirements += `- Understanding of UX principles and best practices\n`;
    requirements += `- Bachelor's degree in Design or related field\n`;
  } else if (isMarketing) {
    requirements += `- Proven track record in marketing campaign management\n`;
    requirements += `- Excellent written and verbal communication skills\n`;
    requirements += `- Experience with marketing analytics tools\n`;
    requirements += `- Bachelor's degree in Marketing, Communications, or related field\n`;
  } else {
    requirements += `- Strong analytical and problem-solving skills\n`;
    requirements += `- Excellent communication and collaboration abilities\n`;
    requirements += `- Proven track record of successful project delivery\n`;
    requirements += `- Bachelor's degree in relevant field\n`;
  }
  
  // Generate Benefits
  const benefits = `\n# Benefits\n\n- Competitive salary package aligned with Pakistan market standards\n- Health insurance coverage for you and your family\n- Annual performance bonuses and salary reviews\n- Professional development opportunities and training budget\n- Flexible working hours and ${isRemote ? 'remote work options' : 'modern office facilities'}\n- Paid time off and public holidays\n- Collaborative and inclusive work environment\n- Career growth opportunities within the organization\n`;
  
  return overview + responsibilities + requirements + benefits;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenerateJDRequest;
    
    // Validate required fields
    if (!body.jobId) {
      return NextResponse.json({ 
        error: "Job ID is required",
        code: "MISSING_JOB_ID" 
      }, { status: 400 });
    }
    
    if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
      return NextResponse.json({ 
        error: "Prompt is required and must be a non-empty string",
        code: "INVALID_PROMPT" 
      }, { status: 400 });
    }
    
    // Validate jobId is a valid integer
    const jobId = parseInt(body.jobId.toString());
    if (isNaN(jobId)) {
      return NextResponse.json({ 
        error: "Job ID must be a valid integer",
        code: "INVALID_JOB_ID" 
      }, { status: 400 });
    }
    
    // Check if job exists
    const existingJob = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    
    if (existingJob.length === 0) {
      return NextResponse.json({ 
        error: "Job not found",
        code: "JOB_NOT_FOUND" 
      }, { status: 400 });
    }
    
    const job = existingJob[0];
    
    // Generate mock AI job description
    const generatedContent = generateMockJD(job.title, body.prompt.trim());
    
    const now = new Date().toISOString();
    
    // Create new JD version
    const newVersion = await db.insert(jdVersions)
      .values({
        jobId: jobId,
        contentMd: generatedContent,
        createdBy: body.createdBy || null,
        source: 'ai',
        createdAt: now
      })
      .returning();
    
    if (newVersion.length === 0) {
      return NextResponse.json({ 
        error: "Failed to create JD version",
        code: "CREATE_FAILED" 
      }, { status: 500 });
    }
    
    // Update job with generated description
    await db.update(jobs)
      .set({
        descriptionMd: generatedContent,
        updatedAt: now
      })
      .where(eq(jobs.id, jobId));
    
    return NextResponse.json(newVersion[0], { status: 201 });
    
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}