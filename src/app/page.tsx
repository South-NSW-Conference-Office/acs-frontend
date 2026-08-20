'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import { AuthService } from "../lib/auth";
import { usePermissions } from "@/contexts/HierarchicalPermissionContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: contextLoading, reloadPermissions } = usePermissions();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!contextLoading && user) {
      console.log('[LoginPage] User authenticated, redirecting to dashboard');
      router.push('/dashboard');
    } else if (!contextLoading && !user) {
      console.log('[LoginPage] No user found, staying on login page');
    }
  }, [user, contextLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await AuthService.login(formData);
      
      if (response.success && response.data) {
        // Store the token
        AuthService.setToken(response.data.token);
        
        // Reload permissions to update sidebar immediately
        await reloadPermissions();
        
        // Redirect to dashboard or main admin page
        router.push('/dashboard');
      } else {
        // `message` first: it is the explanation written for the person signing in.
        // `err` is a terse internal reason ("Password not set") and makes a poor
        // substitute — see the note in AuthService.login.
        setError(
          response.message ||
            response.err ||
            'Login failed. Please check your credentials.'
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking authentication
  if (contextLoading) {
    return (
      <div className="min-h-screen bg-[#454545] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't show login form if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#454545] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <Image
              src="/logo.png"
              alt="Adventist Community Services Logo"
              width={180}
              height={180}
              className="object-contain mx-auto rounded-xl"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
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
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-navy-medium focus:border-transparent transition-colors outline-none text-navy-deep placeholder-neutral-gray disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-navy-deep mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-navy-medium focus:border-transparent transition-colors outline-none text-navy-deep placeholder-neutral-gray disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-navy-medium border-gray-300 rounded focus:ring-navy-medium focus:ring-2"
                />
                <span className="ml-2 text-neutral-gray">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-navy-medium hover:text-navy-deep transition-colors">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-center text-sm text-neutral-gray">
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
