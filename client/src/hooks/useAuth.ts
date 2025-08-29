import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: authResponse, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user: authResponse,
    linkedPlayer: authResponse?.linkedPlayer || null,
    isLinkedToPlayer: authResponse?.isLinkedToPlayer || false,
    isLoading,
    isAuthenticated: !!authResponse,
  };
}

interface User {
  email?: string;
  [key: string]: any;
}

interface Player {
  id: string;
  email: string | null;
  name: string;
  isAdmin: boolean;
  [key: string]: any;
}

// Helper hook to get current player using linked player data
export function useCurrentPlayer() {
  const { user, linkedPlayer, isLinkedToPlayer, isLoading } = useAuth();

  return {
    currentPlayer: linkedPlayer,
    isLoading,
    isAuthenticated: !!user,
    isLinkedToPlayer,
  };
}
