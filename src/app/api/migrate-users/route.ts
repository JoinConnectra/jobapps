import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Get all users from our custom table
    const customUsers = await db.select().from(users);
    
    const results = [];
    
    for (const user of customUsers) {
      try {
        // Try to create the user in Better Auth
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/sign-up/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            password: 'tempPassword123!', // Temporary password
            name: user.name,
          }),
        });
        
        if (response.ok) {
          results.push({ email: user.email, status: 'created' });
        } else {
          const error = await response.json();
          results.push({ email: user.email, status: 'error', error: error.message });
        }
      } catch (error) {
        results.push({ email: user.email, status: 'error', error: error.message });
      }
    }
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
