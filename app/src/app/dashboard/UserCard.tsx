"use client";

import { User } from "@/app/lib/types";

type UserCardProps = {
  user: User;
  organizationId: string;
};

export default function UserCard({ user, organizationId }: UserCardProps) {
  const membership = user.memberships.find(
    (m) => m.organization.id === organizationId
  );

  if (!membership) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Your Profile</h2>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-500">Name</label>
          <p className="text-lg text-gray-900">{user.name}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">Email</label>
          <p className="text-lg text-gray-900">{user.email}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">Organization</label>
          <p className="text-lg text-gray-900">{membership.organization.name}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">Role</label>
          <span className="inline-block mt-1 px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
            {membership.role.name}
          </span>
        </div>
      </div>
    </div>
  );
}
