"use client";
import { useState } from "react";

export default ({ user }) => {
  const { organizations } = user;
  const [selectedOrganization, setSelectedOrganization] = useState(
    organizations[0]
  );
  return (
    <div>
      {organizations &&
        organizations.map((org) => {
          return <div>{org.name}</div>;
        })}
    </div>
  );
};
