import Link from 'next/link';
import { XCircle } from 'lucide-react';

/**
 * Registration Closed Component
 * Displayed when ALLOW_AUTO_REGISTER is not set to TRUE
 */
export default function RegistrationClosed() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <XCircle className="w-16 h-16 text-red-500 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Registration Closed</h2>
        <p className="text-gray-600 dark:text-gray-400">
          New user registration is currently disabled. Please contact the administrator if you need
          an account.
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
  );
}
