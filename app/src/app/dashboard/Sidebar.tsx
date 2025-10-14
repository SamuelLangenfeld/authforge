"use client";

import { useState } from "react";

type Organization = {
  id: string;
  name: string;
};

type Role = {
  id: string;
  name: string;
};

type Membership = {
  id: string;
  organization: Organization;
  role: Role;
};

type User = {
  id: string;
  name: string;
  email: string;
  memberships: Membership[];
};

type SidebarProps = {
  user: User;
  onOrgSelect?: (orgId: string) => void;
  selectedOrgId?: string;
};

export default function Sidebar({ user, onOrgSelect, selectedOrgId: externalSelectedOrgId }: SidebarProps) {
  const [internalSelectedOrgId, setInternalSelectedOrgId] = useState<string | null>(
    user.memberships[0]?.organization.id || null
  );

  const selectedOrgId = externalSelectedOrgId || internalSelectedOrgId;

  const handleOrgSelect = (orgId: string) => {
    setInternalSelectedOrgId(orgId);
    onOrgSelect?.(orgId);
  };

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2">Organizations</h2>
        <p className="text-sm text-gray-400">Signed in as {user.name}</p>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2">
          {user.memberships.map((membership) => (
            <li key={membership.id}>
              <button
                onClick={() => handleOrgSelect(membership.organization.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  selectedOrgId === membership.organization.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <div className="font-medium">{membership.organization.name}</div>
                <div className="text-xs mt-1 opacity-75 capitalize">
                  {membership.role.name}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-800">
        <button className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
          Settings
        </button>
        <button className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
          Sign Out
        </button>
      </div>
    </aside>
  );
}
