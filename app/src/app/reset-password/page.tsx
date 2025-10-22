"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPassword() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token]);

  const handleSubmit: React.FormEventHandler = async (e) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || data.error || "Failed to reset password"
        );
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Redirect to landing page after 3 seconds
      setTimeout(() => {
        router.push("/landing");
      }, 3000);
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            AuthForge
          </h1>
          <h2 className="text-lg font-semibold text-center text-gray-700 mb-8">
            Reset Password
          </h2>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
            <p className="text-red-800 text-sm">
              Invalid reset link. Please request a new password reset.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition"
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          AuthForge
        </h1>
        <h2 className="text-lg font-semibold text-center text-gray-700 mb-8">
          Reset Password
        </h2>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm font-medium mb-1">
                Password reset successful!
              </p>
              <p className="text-green-700 text-xs">
                You will be redirected to the sign in page momentarily. If not, click below.
              </p>
            </div>
            <Link
              href="/landing"
              className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition"
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-gray-600 text-sm mb-6">
              Enter your new password. Password must be at least 12 characters.
            </p>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-gray-50"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-gray-50"
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <div className="mt-4 text-center">
              <p className="text-gray-600 text-sm">
                <Link
                  href="/landing"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Back to Sign In
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
