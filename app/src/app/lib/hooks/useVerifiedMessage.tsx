import React, { useState, useEffect } from "react";

type UseVerifiedMessageProps = {
  verified: boolean;
  message?: string;
};

export function useVerifiedMessage({
  verified,
  message = "Email verified successfully!",
}: UseVerifiedMessageProps) {
  const [showMessage, setShowMessage] = useState(verified);

  // Auto-hide the verification message after 5 seconds
  useEffect(() => {
    if (showMessage) {
      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showMessage]);

  const VerifiedMessage = showMessage ? (
    <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
      {message}
    </div>
  ) : null;

  return { VerifiedMessage };
}
