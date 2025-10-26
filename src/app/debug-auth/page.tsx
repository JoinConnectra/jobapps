"use client";

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export default function DebugAuthPage() {
  const [email, setEmail] = useState('asadiq@bu.edu');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<any>(null);

  const testSignIn = async () => {
    try {
      const response = await authClient.signInWithEmail({
        email,
        password,
      });
      setResult({ success: true, data: response });
    } catch (error) {
      setResult({ success: false, error: error });
    }
  };

  const testSignUp = async () => {
    try {
      const response = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: 'Test User',
        }),
      });
      const data = await response.json();
      setResult({ success: response.ok, data, status: response.status });
    } catch (error) {
      setResult({ success: false, error: error });
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Debug Page</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div className="space-x-2">
          <button
            onClick={testSignIn}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Sign In
          </button>
          <button
            onClick={testSignUp}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test Sign Up
          </button>
        </div>
        
        {result && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Result</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
