import { useContext } from "react";
import { UserContext } from "@/context/UserContext";

export default function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    return { user: null, loading: false };
  }

  return context;
}