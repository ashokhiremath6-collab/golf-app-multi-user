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

// Helper hook to get current player by matching email
export function useCurrentPlayer() {
  const { user, isLoading: userLoading } = useAuth();
  
  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ["/api/players"],
    retry: false,
    enabled: !!(user as User)?.email,
  });

  // Handle email mismatch between login and database
  const userEmail = (user as User)?.email;
  
  // Debug: Log user email to help troubleshoot
  if (userEmail && userEmail.includes('shivam')) {
    console.log('Shivam login email:', userEmail);
    console.log('Available players:', (players as Player[])?.map((p: Player) => ({ name: p.name, email: p.email })));
  }
  
  const currentPlayer = (players as Player[])?.find((p: Player) => 
    p.email === userEmail || 
    (userEmail === 'ashokhiremath6@gmail.com' && p.email === 'ashok@example.com')
  );

  return {
    currentPlayer,
    isLoading: userLoading || playersLoading,
    isAuthenticated: !!user,
  };
}
