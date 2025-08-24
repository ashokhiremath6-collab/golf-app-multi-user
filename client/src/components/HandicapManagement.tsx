import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface HandicapSnapshot {
  id: string;
  playerId: string;
  playerName: string;
  month: string;
  prevHandicap: number;
  roundsCount: number;
  avgMonthlyOverPar: number | null;
  delta: number;
  newHandicap: number;
  createdAt: string;
}

interface Player {
  id: string;
  name: string;
  email: string;
  currentHandicap: number;
  isAdmin: boolean;
}

export default function HandicapManagement() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState('');
  const [recalcWindow, setRecalcWindow] = useState('previous');

  // Get current month in YYYY-MM format
  const currentMonth = new Date().toISOString().slice(0, 7);
  const previousMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ["/api/players"],
    retry: false,
  });

  const { data: snapshots, isLoading: snapshotsLoading } = useQuery({
    queryKey: ["/api/handicaps/snapshots"],
    retry: false,
  });

  const { data: monthlyStats } = useQuery({
    queryKey: ["/api/handicaps/summary", selectedMonth || previousMonth],
    enabled: !!(selectedMonth || previousMonth),
    retry: false,
  });

  const runRecalculationMutation = useMutation({
    mutationFn: async (data: { window: string; month?: string }) => {
      return await apiRequest("POST", "/api/handicaps/apply", data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/handicaps/snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/handicaps/summary"] });
      toast({
        title: "Success",
        description: `Handicap recalculation completed. ${data.playersUpdated || 0} players updated.`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to run handicap recalculation",
        variant: "destructive",
      });
    },
  });

  const exportCSVMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/handicaps/export", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to export data");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `handicap-snapshots-${new Date().toISOString().slice(0, 7)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Handicap data exported successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to export handicap data",
        variant: "destructive",
      });
    },
  });

  const handleRecalculation = () => {
    const data: { window: string; month?: string } = { window: recalcWindow };
    if (recalcWindow === 'specific' && selectedMonth) {
      data.month = selectedMonth;
    }
    runRecalculationMutation.mutate(data);
  };

  const getHandicapChange = (delta: number) => {
    if (delta > 0) return <Badge variant="destructive">+{delta}</Badge>;
    if (delta < 0) return <Badge variant="default">{delta}</Badge>;
    return <Badge variant="secondary">0</Badge>;
  };

  if (playersLoading) {
    return (
      <Card data-testid="card-handicap-loading">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const playersArray = (players as Player[]) || [];
  const snapshotsArray = (snapshots as HandicapSnapshot[]) || [];

  return (
    <div className="space-y-6">
      {/* Handicap Recalculation */}
      <Card data-testid="card-handicap-recalculation">
        <CardHeader>
          <CardTitle className="flex items-center text-golf-blue">
            <i className="fas fa-calculator mr-2"></i>
            Handicap Recalculation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <i className="fas fa-exclamation-triangle text-yellow-400 mr-2 mt-1"></i>
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Recalculation Process</p>
                  <p>Updates player handicaps using: 50% monthly average + 50% previous handicap. Changes are limited to ±2 and floored at 0.</p>
                </div>
              </div>
            </div>

            {/* Recalculation Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recalc-window">Recalculation Window</Label>
                  <Select value={recalcWindow} onValueChange={setRecalcWindow}>
                    <SelectTrigger data-testid="select-recalc-window">
                      <SelectValue placeholder="Select window" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="previous">Previous Month ({previousMonth})</SelectItem>
                      <SelectItem value="current">Current Month ({currentMonth})</SelectItem>
                      <SelectItem value="specific">Specific Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recalcWindow === 'specific' && (
                  <div>
                    <Label htmlFor="specific-month">Month (YYYY-MM)</Label>
                    <Input
                      id="specific-month"
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      data-testid="input-specific-month"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p><strong>Active Players:</strong> {playersArray.filter(p => !p.isAdmin).length}</p>
                  <p><strong>Current Season:</strong> 2024-2025</p>
                  <p><strong>K-Factor:</strong> 0.5 (50% weighting)</p>
                  <p><strong>Change Cap:</strong> ±2 strokes</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700"
                    data-testid="button-run-recalculation"
                  >
                    <i className="fas fa-calculator mr-2"></i>Run Recalculation
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent data-testid="dialog-confirm-recalculation">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Handicap Recalculation</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will recalculate handicaps for all players based on rounds played in the{' '}
                      {recalcWindow === 'previous' ? 'previous month' : 
                       recalcWindow === 'current' ? 'current month' : 
                       `month of ${selectedMonth}`}. 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-recalculation">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRecalculation}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-confirm-recalculation"
                    >
                      Run Recalculation
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button 
                variant="outline" 
                onClick={() => exportCSVMutation.mutate()}
                disabled={exportCSVMutation.isPending}
                data-testid="button-export-csv"
              >
                <i className="fas fa-download mr-2"></i>
                {exportCSVMutation.isPending ? "Exporting..." : "Export CSV"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Player Handicaps */}
      <Card data-testid="card-current-handicaps">
        <CardHeader>
          <CardTitle className="flex items-center text-golf-blue">
            <i className="fas fa-users mr-2"></i>
            Current Player Handicaps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Current Handicap</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playersArray.map((player: Player) => (
                  <TableRow key={player.id} data-testid={`row-player-handicap-${player.id}`}>
                    <TableCell className="font-medium" data-testid={`text-player-name-${player.id}`}>
                      {player.name}
                    </TableCell>
                    <TableCell data-testid={`text-player-email-${player.id}`}>
                      {player.email}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-player-handicap-${player.id}`}>
                      <Badge variant="outline" className="font-mono">
                        {player.currentHandicap}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {player.isAdmin ? (
                        <Badge variant="secondary">Admin</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Handicap History */}
      <Card data-testid="card-handicap-history">
        <CardHeader>
          <CardTitle className="flex items-center text-golf-blue">
            <i className="fas fa-history mr-2"></i>
            Handicap Change History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {snapshotsLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : snapshotsArray.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Previous</TableHead>
                    <TableHead className="text-right">Rounds</TableHead>
                    <TableHead className="text-right">Avg Over Par</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">New Handicap</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshotsArray
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 20)
                    .map((snapshot: HandicapSnapshot) => (
                    <TableRow key={snapshot.id} data-testid={`row-snapshot-${snapshot.id}`}>
                      <TableCell className="font-medium">
                        {snapshot.playerName}
                      </TableCell>
                      <TableCell>{snapshot.month}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{snapshot.prevHandicap}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{snapshot.roundsCount}</TableCell>
                      <TableCell className="text-right">
                        {snapshot.avgMonthlyOverPar !== null ? 
                          `+${parseFloat(snapshot.avgMonthlyOverPar.toString()).toFixed(1)}` : 
                          'N/A'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {getHandicapChange(snapshot.delta)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default">{snapshot.newHandicap}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(snapshot.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8" data-testid="empty-state-snapshots">
              <i className="fas fa-chart-line text-4xl text-gray-300 mb-4"></i>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No handicap history found</h4>
              <p className="text-gray-500">Run your first handicap recalculation to see changes here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}