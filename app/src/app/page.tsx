import "react";
import Landing from "./landing/page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const params = await searchParams;
  const verified = params.verified === "true";

  return <Landing verified={verified} />;
}
