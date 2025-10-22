"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function AcceptInvitationClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [name, setName] = useState("");
  const [password, setConfirmPassword] = useState("");
  const [confirmPassword, setConfirmPasswordField] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [invitationEmail, setInvitationEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  // Verify invitation token on mount
  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link. No token provided.");
      return;
    }

    verifyInvitation();
  }, [token]);

  const verifyInvitation = async () => {
    try {
      setLoading(true);

      // Try to get invitation details by attempting accept with just token
      // This will fail but we can extract info from error response
      // For now, we'll proceed directly to the form
      setLoading(false);
    } catch {
      setError("Failed to verify invitation");
      setLoading(false);
    }
  };

  const handleRegister: React.FormEventHandler = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || "Failed to accept invitation");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setInvitationEmail(data.data?.user?.email || "");
      setOrganizationName(data.data?.organization?.name || "");

      // Redirect to landing to sign in after 3 seconds
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
            Organization Invitation
          </h2>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
            <p className="text-red-800 text-sm">
              Invalid invitation link. No token provided.
            </p>
          </div>
          <Link
            href="/landing"
            className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition"
          >
            Go to Sign In
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
          Accept Invitation
        </h2>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm font-medium mb-1">
                Invitation accepted!
              </p>
              <p className="text-green-700 text-xs">
                Account created for {invitationEmail}. You have been added to{" "}
                {organizationName}. Redirecting to sign in...
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
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="text-gray-600 text-sm mb-6">
              Complete your account setup to join the organization.
            </p>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-gray-50"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-gray-50"
                placeholder="Create a strong password (12+ characters)"
              />
              <p className="text-xs text-gray-500 mt-1">
                At least 12 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPasswordField(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-gray-50"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Accepting..." : "Accept Invitation"}
            </button>

            <div className="mt-4 text-center">
              <p className="text-gray-600 text-sm">
                Already have an account?{" "}
                <Link
                  href="/landing"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          AuthForge
        </h1>
        <h2 className="text-lg font-semibold text-center text-gray-700 mb-8">
          Loading...
        </h2>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitation() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AcceptInvitationClient />
    </Suspense>
  );
}
