"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function UniversityRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    universityName: '',
    domain: '',
    contactEmail: '',
    adminName: '',
    password: '',
    location: '',
    type: 'public',
    description: '',
  });

  const update = (k: string, v: string) => setForm(s => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/university/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push('/university/dashboard');
    } catch (e) {
      console.error(e);
      alert('Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Back Button */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 z-10 flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Home</span>
      </Link>

      {/* Left Side - Background Image */}
      <div className="w-1/2 h-screen relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/register_bg.png')" }}
        />
      </div>

      {/* Right Side - University Registration Form */}
      <div className="w-1/2 h-screen flex items-center justify-center bg-white">
        <div className="w-[360px] space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground mb-2">Create your university account</h1>
            <p className="text-sm text-muted-foreground">Institution portal for managing company partnerships</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>University name</Label>
              <Input value={form.universityName} onChange={e => update('universityName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input placeholder="lums.edu.pk" value={form.domain} onChange={e => update('domain', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Admin name</Label>
                <Input value={form.adminName} onChange={e => update('adminName', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contact email</Label>
                <Input type="email" value={form.contactEmail} onChange={e => update('contactEmail', e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={e => update('password', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={e => update('location', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Input value={form.type} onChange={e => update('type', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => update('description', e.target.value)} />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}


