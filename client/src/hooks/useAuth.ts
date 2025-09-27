import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Always call both queries to maintain hook order
  const { data: authResponse, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: previewStatus } = useQuery({
    queryKey: ["/api/preview/status"],
    retry: false,
  });

  const isPreviewMode = (previewStatus as any)?.preview || false;

  // Only consider authenticated if we have actual user data or preview mode
  // Don't treat 401 errors as authenticated - that would allow unauthenticated users access
  const isAuthenticated = !!authResponse || isPreviewMode;

  return {
    user: authResponse,
    linkedPlayer: (authResponse as any)?.linkedPlayer || null,
    isLinkedToPlayer: (authResponse as any)?.isLinkedToPlayer || false,
    isSuperAdmin: (authResponse as any)?.isSuperAdmin || false,
    isLoading,
    isAuthenticated,
    isPreviewMode,
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
  const { user, linkedPlayer, isLinkedToPlayer, isLoading, isPreviewMode, isSuperAdmin } = useAuth();

  return {
    currentPlayer: linkedPlayer,
    isLoading,
    isAuthenticated: !!user || isPreviewMode, // Allow access in preview mode
    isLinkedToPlayer,
    isPreviewMode,
    isSuperAdmin,
  };
}
