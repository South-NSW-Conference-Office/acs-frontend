'use client';

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Button from '../../components/Button';

interface UserData {
  email: string;
  name: string;
  verified: boolean;
  passwordSet: boolean;
  requiresPasswordSetup: boolean;
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token');
  
  const initialState = useMemo(() => {
    if (!token) {
      return { status: 'error' as const, message: 'Invalid verification link. No token provided.' };
    }
    return { status: 'loading' as const, message: '' };
  }, [token]);
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'password-setup'>(initialState.status);
  const [message, setMessage] = useState(initialState.message);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const hasCheckedTokenRef = useRef(false);

  const verifyEmail = useCallback(async (verificationToken: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
        // Don't auto-redirect - let user click the button to go to login
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to verify email. The link may be expired or invalid.');
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      setStatus('error');
      setMessage('An error occurred while verifying your email. Please try again later.');
    }
  }, []);

  const checkToken = useCallback(async (verificationToken: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/check-verification-token/${verificationToken}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setUserData(data.data);
        // Show password setup if user hasn't set their initial password yet
        if (!data.data.passwordSet) {
          setStatus('password-setup');
        } else {
          // User already has password, just verify email
          verifyEmail(verificationToken);
        }
      } else {
        setStatus('error');
        setMessage(data.message || 'Invalid verification token.');
      }
    } catch (error) {
      console.error('Error checking token:', error);
      setStatus('error');
      setMessage('An error occurred while checking your verification link.');
    }
  }, [verifyEmail]);

  const verifyEmailAndSetPassword = useCallback(async (verificationToken: string, newPassword: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/verify-email-and-set-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken, password: newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Account setup completed successfully! Your email has been verified and password has been set.');
        // Don't auto-redirect - let user click the button to go to login
      } else {
        setPasswordError(data.message || 'Failed to set password. Please try again.');
      }
    } catch (error) {
      console.error('Error setting password:', error);
      setPasswordError('An error occurred while setting your password. Please try again.');
    }
  }, []);

  const handlePasswordSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      setPasswordError('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    if (!token) {
      setPasswordError('Verification token is missing.');
      return;
    }

    setIsSubmitting(true);
    await verifyEmailAndSetPassword(token, password);
    setIsSubmitting(false);
  }, [password, confirmPassword, token, verifyEmailAndSetPassword]);

  // Check token when component mounts
  useEffect(() => {
    if (token && !hasCheckedTokenRef.current && initialState.status === 'loading') {
      hasCheckedTokenRef.current = true;
      setTimeout(() => checkToken(token), 0);
    }
  }, [token, initialState.status, checkToken]);

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
              {status === 'password-setup' ? 'Account Setup' : 'Email Verification'}
            </h1>
            <p className="text-neutral-gray text-sm">
              Adventist Community Services
            </p>
          </div>
          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F5821F] mx-auto"></div>
              <p className="mt-4 text-sm text-neutral-gray">Checking your verification link...</p>
            </div>
          )}

          {status === 'password-setup' && userData && (
            <div>
              <div className="text-center mb-8">
                <h3 className="text-lg font-medium text-navy-deep mb-2">Welcome, {userData.name}!</h3>
                <p className="text-neutral-gray text-sm mb-1">
                  Please set your password to complete your account setup.
                </p>
                <p className="text-neutral-gray text-xs">Email: {userData.email}</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                {passwordError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {passwordError}
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-navy-deep mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-navy-medium focus:border-transparent transition-colors outline-none text-navy-deep placeholder-neutral-gray disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                      disabled={isSubmitting}
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
                  <p className="mt-1 text-xs text-neutral-gray">Must be at least 8 characters with uppercase, lowercase, number, and special character</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-navy-deep mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-navy-medium focus:border-transparent transition-colors outline-none text-navy-deep placeholder-neutral-gray disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                      disabled={isSubmitting}
                    >
                      {showConfirmPassword ? (
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

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Setting up account...' : 'Complete Account Setup'}
                </Button>
              </form>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-navy-deep mb-2">Account Setup Complete!</h3>
              <p className="text-neutral-gray text-sm mb-4">{message}</p>
              <p className="text-neutral-gray text-xs mb-6">
                You can now log in with your email and the password you just created.
              </p>
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => router.push('/')}
              >
                Continue to Login
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-navy-deep mb-2">Verification Failed</h3>
              <p className="text-neutral-gray text-sm mb-4">{message}</p>
              <p className="text-neutral-gray text-xs mb-6">
                Please contact your administrator to resend the verification email.
              </p>
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => router.push('/')}
              >
                Return to Login
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-gray mb-4">
            Need help?{' '}
            <span className="text-navy-medium">
              Contact your system administrator
            </span>
          </p>
          <p className="text-xs text-neutral-gray">
            © 2025 Adventist Community Services. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}