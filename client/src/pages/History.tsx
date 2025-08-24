import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import RoundHistory from "@/components/RoundHistory";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function History() {
  const { toast } = useToast();
  const { currentPlayer, isAuthenticated, isLoading } = useCurrentPlayer();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("self");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

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

  const { data: players } = useQuery({
    queryKey: ["/api/players"],
    retry: false,
  });


  // Construct proper query parameters for rounds API
  const roundsPlayerId = selectedPlayerId === "self" ? currentPlayer?.id : selectedPlayerId;
  const roundsMonth = selectedMonth === "all" ? undefined : selectedMonth;
  
  const { data: rounds, isLoading: roundsLoading } = useQuery({
    queryKey: ["/api/rounds", { playerId: roundsPlayerId, month: roundsMonth }],
    queryFn: ({ queryKey }) => {
      const [, params] = queryKey as [string, { playerId?: string; month?: string }];
      const searchParams = new URLSearchParams();
      if (params.playerId) searchParams.set('playerId', params.playerId);
      if (params.month) searchParams.set('month', params.month);
      return fetch(`/api/rounds?${searchParams.toString()}`, { credentials: 'include' }).then(res => res.json());
    },
    enabled: !!roundsPlayerId,
    retry: false,
  });

  if (isLoading) {
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

  const displayPlayerId = selectedPlayerId === "self" ? currentPlayer?.id : selectedPlayerId;
  const displayPlayer = selectedPlayerId === "self" ? currentPlayer : (players as any[])?.find((p: any) => p.id === selectedPlayerId);

  // Generate month options for the last 12 months
  const generateMonthOptions = () => {
    const options = [{ value: "all", label: "All Months" }];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();

  // Calculate monthly summary
  const calculateMonthlySummary = () => {
    if (!rounds || rounds.length === 0) {
      return { roundsPlayed: 0, avgGross: 0, avgNet: 0, avgOverPar: 0 };
    }

    const roundsPlayed = rounds.length;
    const avgGross = rounds.reduce((sum: number, round: any) => sum + round.grossCapped, 0) / roundsPlayed;
    const avgNet = rounds.reduce((sum: number, round: any) => sum + round.net, 0) / roundsPlayed;
    const avgOverPar = rounds.reduce((sum: number, round: any) => sum + parseFloat(round.overPar), 0) / roundsPlayed;

    return {
      roundsPlayed,
      avgGross: Math.round(avgGross),
      avgNet: Math.round(avgNet),
      avgOverPar: avgOverPar.toFixed(1),
    };
  };

  const summary = calculateMonthlySummary();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Card data-testid="card-history">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900" data-testid="text-history-title">
                Score History
              </h2>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48" data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} data-testid={`select-month-${option.value}`}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Player Selection */}
            <div className="flex space-x-2 mb-6 overflow-x-auto">
              <Button
                variant={selectedPlayerId === "self" ? "default" : "outline"}
                onClick={() => setSelectedPlayerId("self")}
                className={selectedPlayerId === "self" ? "bg-golf-green text-white" : ""}
                data-testid="button-select-self"
              >
                Your Rounds
              </Button>
              {(players as any[])?.filter((p: any) => p.id !== currentPlayer?.id).map((player: any) => (
                <Button
                  key={player.id}
                  variant={selectedPlayerId === player.id ? "default" : "outline"}
                  onClick={() => setSelectedPlayerId(player.id)}
                  className={`whitespace-nowrap ${selectedPlayerId === player.id ? "bg-golf-green text-white" : ""}`}
                  data-testid={`button-select-player-${player.id}`}
                >
                  {player.name}
                </Button>
              ))}
            </div>

            {/* Rounds List */}
            {roundsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : rounds && rounds.length > 0 ? (
              <RoundHistory rounds={rounds} />
            ) : (
              <div className="text-center py-8" data-testid="empty-state-rounds">
                <i className="fas fa-golf-ball text-4xl text-gray-300 mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rounds found</h3>
                <p className="text-gray-500">
                  {selectedMonth !== "all" 
                    ? `No rounds found for ${monthOptions.find(m => m.value === selectedMonth)?.label}`
                    : `${displayPlayer?.name || 'This player'} hasn't played any rounds yet`
                  }
                </p>
              </div>
            )}

            {/* Monthly Summary */}
            {rounds && rounds.length > 0 && (
              <div className="mt-6 bg-gray-50 rounded-lg p-4" data-testid="card-monthly-summary">
                <h3 className="font-medium text-gray-900 mb-3" data-testid="text-summary-title">
                  {selectedMonth !== "all" 
                    ? `${monthOptions.find(m => m.value === selectedMonth)?.label} Summary`
                    : "Overall Summary"
                  }
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold" data-testid="text-summary-rounds">
                      {summary.roundsPlayed}
                    </div>
                    <div className="text-xs text-gray-600">Rounds Played</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-golf-green" data-testid="text-summary-avg-gross">
                      {summary.avgGross}
                    </div>
                    <div className="text-xs text-gray-600">Avg Gross</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-golf-blue" data-testid="text-summary-avg-net">
                      {summary.avgNet}
                    </div>
                    <div className="text-xs text-gray-600">Avg Net</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-golf-gold" data-testid="text-summary-avg-over-par">
                      +{summary.avgOverPar}
                    </div>
                    <div className="text-xs text-gray-600">Avg Over Par</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
