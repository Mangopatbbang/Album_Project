"use client";

import { createContext, useContext, useEffect, useState } from "react";

type AvatarMap = Record<string, string | null>;

const UserAvatarsContext = createContext<AvatarMap>({});

export function UserAvatarsProvider({ children, initialAvatarMap = {} }: { children: React.ReactNode; initialAvatarMap?: AvatarMap }) {
  const [avatarMap, setAvatarMap] = useState<AvatarMap>(initialAvatarMap);

  useEffect(() => {
    fetch("/api/user-avatars")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
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
