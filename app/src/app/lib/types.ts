// Shared types for the application

export type Organization = {
  id: string;
  name: string;
};

export type Role = {
  id: string;
  name: string;
};

export type Membership = {
  id: string;
  organization: Organization;
  role: Role;
};

export type User = {
  id: string;
  name: string;
  email: string;
  memberships: Membership[];
};

export type Member = {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: {
    id: string;
    name: string;
  };
};
