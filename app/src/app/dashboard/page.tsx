import DashboardClient from "./components/DashboardClient";
import { headers } from "next/headers";
import prisma from "@/app/lib/db";
import { userWithMembershipsSelect } from "@/app/lib/prisma-helpers";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  let user;
  try {
    const allheaders = await headers();
    const userId = allheaders.get("x-user-id") || "";
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: userWithMembershipsSelect,
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

  const params = await searchParams;
  const verified = params.verified === "true";

  return <DashboardClient user={user} verified={verified} />;
}
