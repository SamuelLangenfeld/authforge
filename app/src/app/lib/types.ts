// Shared types for the application

// JWT Payload Types
export type UserJWTPayload = {
  userId: string;
  iat?: number;
  exp?: number;
};

export type APIJWTPayload = {
  clientId: string;
  type: "api";
  orgId: string;
  iat?: number;
  exp?: number;
};

export type RefreshJWTPayload = {
  clientId: string;
  type: "refresh";
  iat?: number;
  exp?: number;
};

export type JWTPayload = UserJWTPayload | APIJWTPayload | RefreshJWTPayload;

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
