"use client";
import { useState } from "react";

type Role = "Admin" | "Management" | "User";

export default function Dashboard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("User");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
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
  const handleUsersClick = async () => {
    const response = await fetch("/api/users");
    const { data } = await response.json();
    setUsers(data.users);
  };
  return (
    <>
      <h1>Dashboard</h1>
      <form action="https://google.com" method="POST" onSubmit={handleSubmit}>
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
        <label>Role:</label>
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          <option value="User">User</option>
          <option value="Management">Management</option>
          <option value="Admin">Admin</option>
        </select>
        <button type="submit">Submit</button>
      </form>
      <div>
        <button onClick={handleUsersClick}>Get users</button>
      </div>
      <div>
        Users:
        <table>
          <tbody>
            {users.map((user) => {
              const { id, email, role } = user;
              const handleUserClick = async () => {
                const response = await fetch(`/api/users/${id}`);
                const { data } = await response.json();
                setSelectedUser(data.user);
              };
              return (
                <tr key={id}>
                  <td>ID: {`${id}`}</td>
                  <td>email: {`${email}`}</td>
                  <td>role: {`${role}`}</td>
                  <td>
                    <button onClick={handleUserClick}>Set user</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectedUser && (
        <div>
          Selected User:
          <div>id:{`${selectedUser.id}`}</div>
          <div>email:{`${selectedUser.email}`}</div>
          <div>role:{`${selectedUser.role}`}</div>
        </div>
      )}
    </>
  );
}
