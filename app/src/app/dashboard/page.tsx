import DashboardClient from "./components/DashboardClient";
import { headers } from "next/headers";
import prisma from "@/app/lib/db";

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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Unable to load user data</p>
      </div>
    );
  }

  return <DashboardClient user={user} />;
}
