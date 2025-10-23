import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const applicationId = formData.get('applicationId') as string;
    const questionId = formData.get('questionId') as string;
    const durationSec = formData.get('durationSec') as string;

    if (!audioFile || !applicationId || !questionId) {
      return NextResponse.json(
        { error: 'Missing required fields', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'audio');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `answer_${applicationId}_${questionId}_${timestamp}.webm`;
    const filePath = join(uploadsDir, filename);

    // Convert File to Buffer and save
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the public URL path
    const publicPath = `/uploads/audio/${filename}`;

    return NextResponse.json({
      success: true,
      audioUrl: publicPath,
      filename: filename,
      duration: parseInt(durationSec) || 0
    }, { status: 201 });

  } catch (error) {
    console.error('Audio upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload audio file' },
      { status: 500 }
    );
  }
}
