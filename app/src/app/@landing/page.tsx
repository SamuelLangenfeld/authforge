"use client";
import { useState } from "react";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState("login");

  const handleSubmit: React.FormEventHandler = async (e) => {
    e.preventDefault();
    let res;
    try {
      res = await fetch("/api/user", {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      console.log("did it?");
      console.log(JSON.stringify(res));
    } catch {
      console.log("danger");
    }
  };

  return (
    <>
      <h1>Landing</h1>
      <form onSubmit={handleSubmit}>
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
        <div>
          <button onClick={() => setLoginType("login")}>Login</button>
          <button onClick={() => setLoginType("signup")}>Sign Up</button>
        </div>
        <button type="submit">Submit</button>
      </form>
    </>
  );
}
