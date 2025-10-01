import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "./useOrganization";
import { useAuth } from "./useAuth";

/**
 * Hook to get the current player profile for the active organization.
 * This ensures the correct player profile is used when a user has profiles in multiple organizations.
 */
export function useOrganizationPlayer() {
  const { currentOrganization } = useOrganization();
  const { user, isLoading: authLoading, isPreviewMode, isSuperAdmin } = useAuth();

  // Fetch players for the current organization
  const { data: players, isLoading: playersLoading } = useQuery<any[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/players`],
    enabled: !!currentOrganization?.id && (!!user || isPreviewMode),
    retry: false,
  });

  // Find the player that matches the current user's email
  const userEmail = (user as any)?.email;
  const currentPlayer = players?.find((p: any) => p.email === userEmail);

  return {
    currentPlayer: currentPlayer || null,
    isLoading: authLoading || playersLoading,
    isAuthenticated: !!user || isPreviewMode,
    isLinkedToPlayer: !!currentPlayer,
    isPreviewMode,
    isSuperAdmin,
  };
}
