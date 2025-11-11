'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, User, AlertCircle, CheckCircle, Forward, XCircle } from 'lucide-react';

export default function SignUpPage() {
  const [alias, setAlias] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAlias, setCheckingAlias] = useState(false);
  const [aliasAvailable, setAliasAvailable] = useState<boolean | null>(null);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);
  const [dnsWarning, setDnsWarning] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Check if auto-registration is enabled
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await fetch('/api/registration-status');
        const data = await response.json();
        setRegistrationEnabled(data.enabled);
      } catch {
        // If we can't check, assume it's enabled (fail open)
        setRegistrationEnabled(true);
      }
    };

    checkRegistrationStatus();
  }, []);

  const checkAliasAvailability = async (aliasValue: string) => {
    if (!aliasValue || aliasValue.length < 2) {
      setAliasAvailable(null);
      return;
    }

    setCheckingAlias(true);
    try {
      const { data, error } = await supabase.rpc('alias_exists', {
        alias_param: aliasValue,
      });

      if (error) {
        console.error('Error checking alias:', error);
        setAliasAvailable(null);
      } else {
        setAliasAvailable(!data);
      }
    } catch (err) {
      console.error('Error checking alias:', err);
      setAliasAvailable(null);
    } finally {
      setCheckingAlias(false);
    }
  };

  const handleAliasChange = (value: string) => {
    // Only allow lowercase letters, numbers, dots, and hyphens
    const sanitized = value.toLowerCase().replace(/[^a-z0-9.-]/g, '');
    setAlias(sanitized);

    // Check availability with debounce
    if (sanitized.length >= 2) {
      const timeoutId = setTimeout(() => {
        checkAliasAvailability(sanitized);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setAliasAvailable(null);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDnsWarning(null);

    // Validation
    if (alias.length < 2) {
      setError('Alias must be at least 2 characters');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (aliasAvailable === false) {
      setError('This alias is already taken');
      setLoading(false);
      return;
    }

    const email = `${alias}@fisica.cat`;

    try {
      // Step 1: Create Supabase auth user
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            alias,
            forward_to: forwardTo || null,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Step 2: Create DNS record via Cloudflare API
      try {
        const dnsResponse = await fetch('/api/dns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            alias,
            forwardTo: forwardTo || undefined,
          }),
        });

        if (!dnsResponse.ok) {
          const dnsError = await dnsResponse.json();
          console.error('DNS creation failed:', dnsError);
          setDnsWarning(
            'Account created successfully, but DNS setup failed. Please contact the administrator to complete email setup.'
          );
          // Don't block sign-up, continue to dashboard
        }
      } catch (dnsError) {
        console.error('DNS request failed:', dnsError);
        setDnsWarning(
          'Account created successfully, but DNS setup failed. Please contact the administrator to complete email setup.'
        );
        // Don't block sign-up, continue to dashboard
      }

      // Success! Redirect to dashboard (even if DNS failed)
      router.push('/dashboard/inbox');
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">fisica.cat</h1>
          <p className="text-gray-600">Create your email account</p>
        </div>

        {/* Check if registration is disabled */}
        {registrationEnabled === false ? (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <XCircle className="w-16 h-16 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Registration Closed</h2>
              <p className="text-gray-600">
                No more users are allowed to sign up. Please contact the administrator.
              </p>
              <div className="pt-4">
                <Link
                  href="/sign-in"
                  className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Sign In
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Sign Up Form */
          <div className="bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleSignUp} className="space-y-6">
            {/* Alias Field */}
            <div>
              <label htmlFor="alias" className="block text-sm font-medium text-gray-700 mb-2">
                Choose your alias *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="alias"
                  type="text"
                  value={alias}
                  onChange={(e) => handleAliasChange(e.target.value)}
                  placeholder="alias"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  disabled={loading}
                />
                {checkingAlias && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                )}
                {!checkingAlias && aliasAvailable === true && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />
                )}
                {!checkingAlias && aliasAvailable === false && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-600" />
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Your email will be: <strong>{alias || 'alias'}@fisica.cat</strong>
              </p>
              {aliasAvailable === false && (
                <p className="text-sm text-red-600 mt-1">This alias is already taken</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Forward To Field (Optional) */}
            <div>
              <label htmlFor="forwardTo" className="block text-sm font-medium text-gray-700 mb-2">
                Forward to (optional)
              </label>
              <div className="relative">
                <Forward className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="forwardTo"
                  type="email"
                  value={forwardTo}
                  onChange={(e) => setForwardTo(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Automatically forward incoming emails to another address
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* DNS Warning Message */}
            {dnsWarning && (
              <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">{dnsWarning}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || aliasAvailable === false || !registrationEnabled}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-blue-600 font-medium hover:text-blue-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
