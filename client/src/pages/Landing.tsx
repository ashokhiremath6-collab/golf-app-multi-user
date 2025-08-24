import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-golf-green to-golf-blue flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <i className="fas fa-golf-ball text-4xl text-golf-green" data-testid="icon-golf-ball"></i>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-app-title">
                Blues Golf Challenge
              </h1>
              <p className="text-gray-600" data-testid="text-app-description">
                Track your golf scores, manage handicaps, and compete with friends
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h3 className="font-medium text-gray-900">Features:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Track 18-hole golf rounds</li>
                  <li>• Automatic handicap calculations</li>
                  <li>• Live leaderboards</li>
                  <li>• Score history and analysis</li>
                </ul>
              </div>

              <Button 
                onClick={handleLogin} 
                className="w-full bg-golf-green hover:bg-green-700"
                data-testid="button-login"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Sign In to Continue
              </Button>
            </div>

            <p className="text-sm font-bold text-golf-green" data-testid="text-season-info">
              2024-25 Season • Ends March 31, 2026
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
