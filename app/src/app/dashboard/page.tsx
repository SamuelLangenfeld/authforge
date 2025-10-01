import OrganizationList from "./OrganizationList";
import { headers } from "next/headers";
import prisma from "../lib/db";
export default async function Dashboard() {
  let user;
  try {
    const allheaders = await headers();
    const userId = allheaders.get("x-user-id") || "";
    user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
            role: true,
          },
        },
      },
    });
  } catch (e) {
    console.log(e);
  }

  return (
    <>
      <h1>Dashboard</h1>
      <div>{user?.name}</div>
      {/* <OrganizationList user={user} /> */}
    </>
  );
}
