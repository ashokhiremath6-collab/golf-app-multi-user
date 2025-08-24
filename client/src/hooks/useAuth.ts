import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

// Helper hook to get current player by matching email
export function useCurrentPlayer() {
  const { user, isLoading: userLoading } = useAuth();
  
  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ["/api/players"],
    retry: false,
    enabled: !!user?.email,
  });

  const currentPlayer = players?.find((p: any) => p.email === user?.email);

  return {
    currentPlayer,
    isLoading: userLoading || playersLoading,
    isAuthenticated: !!user,
  };
}
