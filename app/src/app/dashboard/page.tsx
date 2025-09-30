import OrganizationList from "./OrganizationList";

export default async function Dashboard() {
  let res;
  let user;
  try {
    console.log("trying fetch");
    res = await fetch(`${process.env.HOST_URL}/api/me`);
    console.log(!!res);
    if (!res.ok) {
      throw new Error("Failed to fetch dashboard data");
    }
    const json = await res.json();
    console.log(json);
  } catch (e) {
    console.log(e);
  }

  return (
    <>
      <h1>Dashboard</h1>
      {/* <OrganizationList user={user} /> */}
    </>
  );
}
