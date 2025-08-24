import { useQuery } from "@tanstack/react-query";

interface GroupSettings {
  groupName?: string;
  seasonEnd?: string;
  leaderboardMetric?: string;
  kFactor?: string;
  changeCap?: string;
}

export function useGroupName() {
  const { data: settings, isLoading } = useQuery<GroupSettings>({
    queryKey: ["/api/group/settings"],
    retry: false,
  });

  return {
    groupName: settings?.groupName || 'Blues Golf Challenge',
    isLoading,
  };
}