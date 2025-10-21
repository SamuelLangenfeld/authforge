"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import MembersCard from "./MembersCard";
import UserCard from "./UserCard";
import { User } from "@/app/lib/types";
import { useVerifiedMessage } from "@/app/lib/hooks/useVerifiedMessage";

type DashboardClientProps = {
  user: User;
  verified?: boolean;
};

export default function DashboardClient({
  user,
  verified = false,
}: DashboardClientProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    user.memberships[0]?.organization.id || ""
  );
  const { VerifiedMessage } = useVerifiedMessage({
    verified,
    message: "Email verified successfully! Your account is now fully activated.",
  });

  // Find the current membership for the selected organization
  const currentMembership = user.memberships.find(
    (m) => m.organization.id === selectedOrgId
  );

  const isAdmin = currentMembership?.role.name === "admin";

  return (
    <div className="flex min-h-screen">
      <Sidebar
        user={user}
        selectedOrgId={selectedOrgId}
        onOrgSelect={setSelectedOrgId}
      />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>

        {VerifiedMessage}

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Welcome, {user.name}!</h2>
            <p className="text-gray-600">{user.email}</p>
          </div>

          {selectedOrgId && (
            isAdmin ? (
              <MembersCard organizationId={selectedOrgId} />
            ) : (
              <UserCard user={user} organizationId={selectedOrgId} />
            )
          )}
        </div>
      </main>
    </div>
  );
}
