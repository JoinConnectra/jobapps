import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const { key } = params;
    console.log('Audio API called with key:', key);
    
    // Create a proper WAV file with actual audio data (1 second of silence)
    const sampleRate = 44100;
    const duration = 1; // 1 second
    const numSamples = sampleRate * duration;
    const dataSize = numSamples * 2; // 16-bit samples
    const fileSize = 36 + dataSize;
    
    const wavFile = new Uint8Array(44 + dataSize);
    const view = new DataView(wavFile.buffer);
    
    // RIFF header
    view.setUint32(0, 0x52494646, false); // "RIFF" (correct byte order)
    view.setUint32(4, fileSize, true); // File size - 8
    view.setUint32(8, 0x57415645, false); // "WAVE" (correct byte order)
    
    // fmt chunk
    view.setUint32(12, 0x666d7420, false); // "fmt " (correct byte order)
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    
    // data chunk
    view.setUint32(36, 0x64617461, false); // "data" (correct byte order)
    view.setUint32(40, dataSize, true); // data size
    
    // Fill with silence (zeros)
    for (let i = 44; i < wavFile.length; i++) {
      wavFile[i] = 0;
    }
    
    return new NextResponse(wavFile, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': wavFile.length.toString(),
        'Cache-Control': 'public, max-age=31536000',
      },
    });
    
  } catch (error) {
    console.error('GET /api/audio/[key] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audio file' },
      { status: 500 }
    );
  }
}