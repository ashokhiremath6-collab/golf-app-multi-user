import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function OrganizationSelector() {
  const { organizations, switchToOrganization, isLoading } = useOrganization();
  const { isSuperAdmin } = useCurrentPlayer();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ⛳ Golf Organizations
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select a golf organization to access your dashboard, manage players, track rounds, and view leaderboards.
          </p>
        </div>

        {isSuperAdmin && (
          <div className="mb-8 text-center">
            <Button
              onClick={() => window.location.href = '/super-admin'}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-super-admin"
            >
              🛡️ Super Admin Dashboard
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {organizations.map((org) => (
            <Card
              key={org.id}
              className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-300"
              onClick={() => switchToOrganization(org.slug)}
              data-testid={`card-organization-${org.slug}`}
            >
              <CardHeader className="text-center">
                <CardTitle className="text-xl flex items-center justify-center gap-2">
                  🏌️ {org.name}
                  {org.isParent && (
                    <Badge variant="secondary" className="text-xs">
                      Parent
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-gray-500">/{org.slug}</p>
              </CardHeader>
              <CardContent className="text-center">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  data-testid={`button-enter-${org.slug}`}
                >
                  Enter Organization
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {organizations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No organizations available.</p>
            {isSuperAdmin && (
              <p className="text-sm text-gray-400 mt-2">
                Use the Super Admin dashboard to create organizations.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}