"use client";

import { useOrganizationMembers } from "@/app/lib/hooks/useOrganization";

type MembersCardProps = {
  organizationId: string;
};

export default function MembersCard({ organizationId }: MembersCardProps) {
  const { members, loading, error } = useOrganizationMembers(organizationId);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Organization Members</h2>
        <p className="text-gray-500">Loading members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Organization Members</h2>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Organization Members</h2>

      {members.length === 0 ? (
        <p className="text-gray-500">No members found</p>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900">{member.user.name}</p>
                <p className="text-sm text-gray-500">{member.user.email}</p>
              </div>
              <div>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                  {member.role.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
