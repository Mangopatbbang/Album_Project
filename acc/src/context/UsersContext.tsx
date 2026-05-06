"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@/types";

type UsersContextType = {
  users: User[];
  getUserById: (id: string) => User | undefined;
};

const UsersContext = createContext<UsersContextType>({ users: [], getUserById: () => undefined });

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { if (Array.isArray(data.users)) setUsers(data.users); })
      .catch(() => {});
  }, []);

  const getUserById = (id: string) => users.find((u) => u.id === id);

  return (
    <UsersContext.Provider value={{ users, getUserById }}>
      {children}
    </UsersContext.Provider>
  );
}

export const useUsers = () => useContext(UsersContext);
