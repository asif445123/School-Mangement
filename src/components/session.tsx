"use client";
import { createContext, useContext } from "react";
export const SessionContext = createContext<{ user: any; setUser: (u: any) => void }>({ user: null, setUser: () => {} });
export const useSession = () => useContext(SessionContext);
