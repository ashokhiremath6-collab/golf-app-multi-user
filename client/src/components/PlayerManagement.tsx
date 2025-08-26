import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Player {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  currentHandicap: number;
  isAdmin: boolean;
}

export default function PlayerManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    currentHandicap: 0,
    isAdmin: false,
  });

  const { data: players, isLoading } = useQuery<Player[]>({
    queryKey: ["/api/players"],
    retry: false,
  });

  const createPlayerMutation = useMutation({
    mutationFn: async (playerData: any) => {
      await apiRequest("POST", "/api/players", playerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({
        title: "Success",
        description: "Player created successfully",
      });
      setIsAddDialogOpen(false);
      resetForm();
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
        description: "Failed to create player",
        variant: "destructive",
      });
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      await apiRequest("PUT", `/api/players/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({
        title: "Success",
        description: "Player updated successfully",
      });
      setEditingPlayer(null);
      resetForm();
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
        description: "Failed to update player",
        variant: "destructive",
      });
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      await apiRequest("DELETE", `/api/players/${playerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({
        title: "Success",
        description: "Player deleted successfully",
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
        description: "Failed to delete player",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      currentHandicap: 0,
      isAdmin: false,
    });
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      email: player.email || '',
      phone: player.phone || '',
      currentHandicap: player.currentHandicap,
      isAdmin: player.isAdmin,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Player name is required",
        variant: "destructive",
      });
      return;
    }

    const playerData = {
      ...formData,
      email: formData.email || null,
      phone: formData.phone || null,
    };

    if (editingPlayer) {
      updatePlayerMutation.mutate({ id: editingPlayer.id, ...playerData });
    } else {
      createPlayerMutation.mutate(playerData);
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="card-player-management-loading">
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

  return (
    <Card data-testid="card-player-management">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900" data-testid="text-player-management-title">
            Manage Players
          </h3>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-golf-green hover:bg-green-700" data-testid="button-add-player">
                <i className="fas fa-plus mr-2"></i>Add Player
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-add-player">
              <DialogHeader>
                <DialogTitle data-testid="text-add-player-title">Add New Player</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Player name"
                    required
                    data-testid="input-player-name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="player@example.com"
                    data-testid="input-player-email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                    data-testid="input-player-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="handicap">Current Handicap</Label>
                  <Input
                    id="handicap"
                    type="number"
                    min="0"
                    max="54"
                    value={formData.currentHandicap}
                    onChange={(e) => setFormData({ ...formData, currentHandicap: parseInt(e.target.value) || 0 })}
                    data-testid="input-player-handicap"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isAdmin"
                    checked={formData.isAdmin}
                    onCheckedChange={(checked) => setFormData({ ...formData, isAdmin: checked })}
                    data-testid="switch-player-admin"
                  />
                  <Label htmlFor="isAdmin">Admin privileges</Label>
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" disabled={createPlayerMutation.isPending} data-testid="button-save-player">
                    {createPlayerMutation.isPending ? "Saving..." : "Save Player"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-cancel-player">
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Player Dialog */}
        <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
          <DialogContent data-testid="dialog-edit-player">
            <DialogHeader>
              <DialogTitle data-testid="text-edit-player-title">Edit Player</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Player name"
                  required
                  data-testid="input-edit-player-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="player@example.com"
                  data-testid="input-edit-player-email"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                  data-testid="input-edit-player-phone"
                />
              </div>
              <div>
                <Label htmlFor="edit-handicap">Current Handicap</Label>
                <Input
                  id="edit-handicap"
                  type="number"
                  min="0"
                  max="54"
                  value={formData.currentHandicap}
                  onChange={(e) => setFormData({ ...formData, currentHandicap: parseInt(e.target.value) || 0 })}
                  data-testid="input-edit-player-handicap"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isAdmin"
                  checked={formData.isAdmin}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAdmin: checked })}
                  data-testid="switch-edit-player-admin"
                />
                <Label htmlFor="edit-isAdmin">Admin privileges</Label>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={updatePlayerMutation.isPending} data-testid="button-update-player">
                  {updatePlayerMutation.isPending ? "Updating..." : "Update Player"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingPlayer(null)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Players Table */}
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="table-players">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Handicap</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Admin</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {players?.map((player: Player) => (
                <tr key={player.id} data-testid={`row-player-${player.id}`}>
                  <td className="px-4 py-4 font-medium" data-testid={`text-player-name-${player.id}`}>
                    {player.name}
                  </td>
                  <td className="px-4 py-4 text-gray-600" data-testid={`text-player-email-${player.id}`}>
                    {player.email || 'N/A'}
                  </td>
                  <td className="px-4 py-4 text-center" data-testid={`text-player-handicap-${player.id}`}>
                    {player.currentHandicap}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Badge 
                      variant={player.isAdmin ? "destructive" : "outline"}
                      data-testid={`badge-player-admin-${player.id}`}
                    >
                      {player.isAdmin ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(player)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        data-testid={`button-edit-player-${player.id}`}
                      >
                        <span className="text-base">✏️</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            data-testid={`button-delete-player-${player.id}`}
                          >
                            <span className="text-base">🗑️</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent data-testid={`dialog-delete-player-${player.id}`}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Player</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {player.name}? This action cannot be undone and will remove all associated rounds.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePlayerMutation.mutate(player.id)}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid="button-confirm-delete"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
