'use client';

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Button from "../../components/Button";
import { API_BASE_URL } from '@/lib/config';
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
      } else {
        setError(data.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#454545] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-[#F5821F] rounded-full mx-auto mb-4 flex items-start justify-center pt-0.5">
              <Image 
                src="/logo-white.png" 
                alt="Adventist Community Services Logo" 
                width={68}
                height={68}
                className="object-contain mx-auto"
              />
            </div>
            <h1 className="text-2xl font-semibold text-navy-deep mb-2">
              Forgot Password?
            </h1>
            <p className="text-neutral-gray text-sm">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                {message}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-navy-deep mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-navy-medium focus:border-transparent transition-colors outline-none text-navy-deep placeholder-neutral-gray disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your email"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <Link 
                href="/"
                className="text-navy-medium hover:text-navy-deep transition-colors text-sm"
              >
                ← Back to Login
              </Link>
            </div>
            
            <p className="text-center text-sm text-neutral-gray mt-4">
              Need help?{' '}
              <a href="#" className="text-navy-medium hover:text-navy-deep transition-colors">
                Contact Support
              </a>
            </p>
            <p className="text-center text-xs text-neutral-gray mt-4">
              © 2025 Adventist Community Services. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}