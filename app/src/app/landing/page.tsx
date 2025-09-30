"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [name, setName] = useState("");
  const [loginType, setLoginType] = useState("login");
  const router = useRouter();

  const handleLogin: React.FormEventHandler = async (e) => {
    e.preventDefault();
    let res;
    try {
      res = await fetch("/api/auth/login", {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    } catch {
      console.log("danger");
    }
  };

  const handleSignup: React.FormEventHandler = async (e) => {
    e.preventDefault();
    let res;
    try {
      res = await fetch("/api/auth/register", {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ email, password, orgName: organization, name }),
      });
      router.push("/dashboard");
    } catch {
      console.log("danger");
    }
  };

  return (
    <>
      <h1>Landing</h1>
      <form
        onSubmit={(e) =>
          loginType === "login" ? handleLogin(e) : handleSignup(e)
        }
      >
        <label>Full Name:</label>
        <input
          type="text"
          name="name"
          onChange={(e) => setName(e.target.value)}
        ></input>
        <label>Email:</label>
        <input
          type="email"
          name="email"
          onChange={(e) => setEmail(e.target.value)}
        ></input>
        <label>Password:</label>
        <input
          type="password"
          name="password"
          onChange={(e) => setPassword(e.target.value)}
        ></input>
        <label>Organization Name:</label>
        <input
          type="text"
          name="organization"
          onChange={(e) => setOrganization(e.target.value)}
        ></input>
        <div>
          {/* <button type="button" onClick={() => setLoginType("login")}>
            Login
          </button> */}
          <button type="button" onClick={() => setLoginType("signup")}>
            Sign Up
          </button>
        </div>
        <button type="submit">Submit</button>
      </form>
    </>
  );
}
