import "react";
import { useRouter } from 'next/navigation';
import Landing from "./landing/page";
import Dashboard from "./dashboard/page";

export default function Page() {
  const isLoggedIn = false;
  return (
    <Landing />
  )
}
