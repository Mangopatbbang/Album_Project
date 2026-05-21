"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@/types";

type UsersContextType = {
  users: User[];
  getUserById: (id: string) => User | undefined;
};

const UsersContext = createContext<UsersContextType>({ users: [], getUserById: () => undefined });

export function UsersProvider({ children, initialUsers = [] }: { children: React.ReactNode; initialUsers?: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { if (Array.isArray(data.users)) setUsers(data.users); })
      .catch(() => {});
  }, []);

  const contextValue = useMemo(() => ({
    users,
    getUserById: (id: string) => users.find((u) => u.id === id),
  }), [users]);

  return (
    <UsersContext.Provider value={contextValue}>
      {children}
    </UsersContext.Provider>
  );
}

export const useUsers = () => useContext(UsersContext);
