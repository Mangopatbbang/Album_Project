"use client";

import { createContext, useContext, useEffect, useState } from "react";

type AvatarMap = Record<string, string | null>;

const UserAvatarsContext = createContext<AvatarMap>({});

export function UserAvatarsProvider({ children }: { children: React.ReactNode }) {
  const [avatarMap, setAvatarMap] = useState<AvatarMap>({});

  useEffect(() => {
    fetch("/api/user-avatars")
      .then((r) => r.json())
      .then(setAvatarMap)
      .catch(() => {});
  }, []);

  return (
    <UserAvatarsContext.Provider value={avatarMap}>
      {children}
    </UserAvatarsContext.Provider>
  );
}

export const useUserAvatars = () => useContext(UserAvatarsContext);
