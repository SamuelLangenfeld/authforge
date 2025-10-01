"use client";
import { useState } from "react";

export default ({ user }: { user: any }) => {
  const { organizations } = user;
  const [selectedOrganization, setSelectedOrganization] = useState(
    organizations[0]
  );
  return (
    <div>
      {organizations &&
        organizations.map((org: any) => {
          return <div>{org.name}</div>;
        })}
    </div>
  );
};
