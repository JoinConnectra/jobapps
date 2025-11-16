import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const { key } = params;
    if (!key || key.trim() === '') {
      console.error('Audio API called with empty key');
      return NextResponse.json(
        { error: 'Audio key is required' },
        { status: 400 }
      );
    }

    const decodedKey = decodeURIComponent(key);
    console.log('Audio API called with key:', decodedKey);
    
    let filePath: string;
    
    // Check if it's a local file path (starts with /uploads/audio/)
    if (decodedKey.startsWith('/uploads/audio/')) {
      // Remove leading slash and serve from public directory
      filePath = join(process.cwd(), 'public', decodedKey);
    } else {
      // Assume it's just a filename, try to find it in uploads/audio directory
      filePath = join(process.cwd(), 'public', 'uploads', 'audio', decodedKey);
    }
    
    console.log('Looking for audio file at:', filePath);
    
    if (!existsSync(filePath)) {
      console.error('Audio file not found at path:', filePath);
      // Try to list what files exist in the directory for debugging
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'audio');
      if (existsSync(uploadsDir)) {
        const fs = require('fs');
        const files = fs.readdirSync(uploadsDir);
        console.log('Files in uploads/audio directory:', files.slice(0, 10));
      }
      return NextResponse.json(
        { error: `Audio file not found: ${decodedKey}` },
        { status: 404 }
      );
    }
    
    const fileBuffer = await readFile(filePath);
    const ext = decodedKey.split('.').pop()?.toLowerCase() || 'webm';
    const contentType = ext === 'webm' ? 'audio/webm' : 
                       ext === 'wav' ? 'audio/wav' :
                       ext === 'mp3' ? 'audio/mpeg' :
                       ext === 'ogg' ? 'audio/ogg' :
                       'audio/webm';
    
    console.log('Serving audio file:', filePath, 'Content-Type:', contentType, 'Size:', fileBuffer.length);
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'Accept-Ranges': 'bytes',
      },
    });
    
  } catch (error) {
    console.error('GET /api/audio/[key] error:', error);
    return NextResponse.json(
      { error: `Failed to fetch audio file: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}