import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Handicaps() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useCurrentPlayer();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ["/api/players"],
    retry: false,
  });

  if (isLoading || playersLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="bg-white rounded-xl h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  const sortedPlayers = (players as any[])?.sort((a, b) => a.currentHandicap - b.currentHandicap) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Card data-testid="card-handicaps">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
              Player Handicaps
            </CardTitle>
            <p className="text-gray-600" data-testid="text-page-description">
              Current handicaps for all players, sorted from lowest to highest
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table data-testid="table-handicaps">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" data-testid="header-rank">#</TableHead>
                    <TableHead data-testid="header-player">Player</TableHead>
                    <TableHead data-testid="header-email">Email</TableHead>
                    <TableHead className="text-center" data-testid="header-handicap">Current Handicap</TableHead>
                    <TableHead className="text-center" data-testid="header-role">Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlayers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500" data-testid="text-no-players">
                        No players found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedPlayers.map((player: any, index: number) => (
                      <TableRow key={player.id} data-testid={`row-player-${player.id}`}>
                        <TableCell className="font-medium text-center" data-testid={`text-rank-${player.id}`}>
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`text-name-${player.id}`}>
                          {player.name}
                        </TableCell>
                        <TableCell className="text-gray-600" data-testid={`text-email-${player.id}`}>
                          {player.email}
                        </TableCell>
                        <TableCell className="text-center" data-testid={`text-handicap-${player.id}`}>
                          <Badge 
                            variant="outline" 
                            className="font-mono text-lg px-3 py-1"
                          >
                            {player.currentHandicap}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center" data-testid={`text-role-${player.id}`}>
                          <Badge 
                            variant={player.isAdmin ? "default" : "secondary"}
                            className={player.isAdmin ? "bg-golf-green" : ""}
                          >
                            {player.isAdmin ? "Admin" : "Player"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {sortedPlayers.length > 0 && (
              <div className="mt-6 text-sm text-gray-500 text-center" data-testid="text-summary">
                Showing {sortedPlayers.length} player{sortedPlayers.length !== 1 ? 's' : ''} • 
                Lowest handicap: {sortedPlayers[0]?.currentHandicap} • 
                Highest handicap: {sortedPlayers[sortedPlayers.length - 1]?.currentHandicap}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}