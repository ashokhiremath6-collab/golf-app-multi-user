import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useGroupName } from "@/hooks/useGroupName";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import augustaBg from "../assets/augusta-national-bg.png";
import { useCurrentPlayer } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizationPlayer } from "@/hooks/useOrganizationPlayer";

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { isSuperAdmin } = useCurrentPlayer();
  const { currentOrganization } = useOrganization();
  const { currentPlayer } = useOrganizationPlayer();
  const { groupName } = useGroupName();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get organization slug for URL building
  const orgSlug = currentOrganization?.slug || '';
  
  // TEMPORARY: Check if user is admin by email directly
  const userEmail = (user as any)?.email;
  const isAdmin = currentPlayer?.isAdmin || userEmail === 'ashokhiremath6@gmail.com';

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  // If no organization slug, show Super Admin only navigation
  const isGlobalContext = !orgSlug;

  const navItems = isGlobalContext 
    ? [
        // Global navigation - only Super Admin when no organization
        ...(isSuperAdmin ? [{ path: '/super-admin', label: 'Super Admin', icon: 'fas fa-shield-alt' }] : []),
      ]
    : [
        // Organization navigation
        { path: `/${orgSlug}`, label: 'Home', icon: 'fas fa-home' },
        { path: `/${orgSlug}/rounds/new`, label: 'New Round', icon: 'fas fa-plus' },
        { path: `/${orgSlug}/leaderboard`, label: 'Leaderboard', icon: 'fas fa-trophy' },
        { path: `/${orgSlug}/history`, label: 'History', icon: 'fas fa-history' },
        { path: `/${orgSlug}/handicaps`, label: 'Handicaps', icon: 'fas fa-users' },
        ...(isAdmin ? [{ path: `/${orgSlug}/admin`, label: 'Admin', icon: 'fas fa-cog' }] : []),
      ];

  const handleNavigation = (path: string) => {
    try {
      setLocation(path);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback: force page navigation
      window.location.href = path;
    }
  };

  // Helper function to check if a path is active
  const isActivePath = (itemPath: string) => {
    // Handle exact matches
    if (location === itemPath) return true;
    
    // Handle root path specially - only match exact root
    if (itemPath === `/${orgSlug}` && location === `/${orgSlug}`) return true;
    
    // For other paths, check if current location starts with the item path
    if (itemPath !== `/${orgSlug}` && location.startsWith(itemPath)) return true;
    
    return false;
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="relative bg-cover bg-center bg-no-repeat shadow-md border-b border-gray-200 sticky top-0 z-50" 
           style={{ backgroundImage: `url(${augustaBg})` }}
           data-testid="nav-desktop">
        <div className="absolute inset-0 bg-white bg-opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-20 relative">
            {/* User info positioned absolutely on left */}
            <div className="absolute left-0 flex items-center space-x-4">
              <button 
                onClick={handleLogout}
                className="text-gray-800 hover:text-gray-900"
                data-testid="button-user-menu"
              >
                <i className="fas fa-user-circle text-2xl"></i>
              </button>
              <div className="hidden sm:block">
                <span className="text-sm text-gray-800 font-medium" data-testid="text-user-name">
                  {currentPlayer?.name || (user as any)?.firstName || 'User'}
                </span>
                <div className="text-xs text-golf-green font-bold" data-testid="text-user-handicap">
                  HCP: {currentPlayer?.currentHandicap || 0}
                </div>
              </div>
            </div>
            
            {/* Centered horizontal title */}
            <div className="flex items-center">
              <i className="fas fa-golf-ball text-golf-green text-3xl mr-4" data-testid="icon-logo"></i>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-app-name">
                {currentOrganization?.name || groupName}
                {currentPlayer?.isAdmin && <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded">ADMIN</span>}
              </h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Tab Navigation */}
      <div className="bg-white border-b border-gray-200 hidden sm:block" data-testid="nav-tabs">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex flex-wrap justify-center gap-2 py-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`py-2 px-4 border-b-2 font-medium whitespace-nowrap ${
                  isActivePath(item.path)
                    ? 'border-golf-green text-golf-green font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                data-testid={`nav-link-${item.path.replace('/', '') || 'home'}`}
              >
                <i className={`${item.icon} mr-2`}></i>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 sm:hidden z-50" data-testid="nav-mobile">
        <div className="flex justify-around py-2 px-2">
          {navItems.filter(item => !item.path.includes('/admin')).map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center py-2 px-2 ${
                isActivePath(item.path) ? 'text-golf-green font-bold' : 'text-gray-700 font-semibold'
              }`}
              data-testid={`nav-mobile-${item.path.replace('/', '') || 'home'}`}
            >
              <i className={`${item.icon} text-lg mb-1`}></i>
              <span className="text-xs font-bold text-gray-800">{item.path === `/${orgSlug}/rounds/new` ? 'New Round' : item.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
