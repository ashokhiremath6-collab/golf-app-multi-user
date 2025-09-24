import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

interface Organization {
  id: string;
  name: string;
  slug: string;
  isParent: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  error: string | null;
  switchToOrganization: (slug: string) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch all organizations
  const { data: organizations = [], isLoading: orgsLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    retry: false,
  });

  // Extract organization slug from URL path
  const getOrgSlugFromPath = (path: string): string | null => {
    // Remove leading slash and get first segment
    const segments = path.replace(/^\//, '').split('/');
    const firstSegment = segments[0];
    
    // Skip if it's a system route
    if (['super-admin', 'api', ''].includes(firstSegment)) {
      return null;
    }
    
    return firstSegment || null;
  };

  // Switch to a specific organization
  const switchToOrganization = (slug: string) => {
    setLocation(`/${slug}`);
  };

  // Effect to set current organization based on URL
  useEffect(() => {
    const orgSlug = getOrgSlugFromPath(location);
    
    if (!orgSlug || organizations.length === 0) {
      setCurrentOrganization(null);
      setError(null);
      return;
    }

    const org = organizations.find(o => o.slug === orgSlug);
    if (org) {
      setCurrentOrganization(org);
      setError(null);
    } else {
      setCurrentOrganization(null);
      setError(`Organization "${orgSlug}" not found`);
    }
  }, [location, organizations]);

  const value: OrganizationContextType = {
    currentOrganization,
    organizations,
    isLoading: orgsLoading,
    error,
    switchToOrganization,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}