import { useEffect, useState, useCallback, useRef } from 'react';
import { useOrganization } from './useOrganization';
import { useToast } from './use-toast';

interface OrgSessionData {
  orgId: string;
  orgSlug: string;
  orgName: string;
  isAdmin: boolean;
  playerId: string | null;
  expiresAt: number;
}

interface OrgSessionState {
  isValid: boolean;
  sessionData: OrgSessionData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  lastError: string | null;
}

export function useOrgSession() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const acquisitionInProgressRef = useRef<string | null>(null);
  const [sessionState, setSessionState] = useState<OrgSessionState>({
    isValid: false,
    sessionData: null,
    isLoading: false,
    isRefreshing: false,
    lastError: null,
  });

  // Acquire organization session (single-flight)
  const acquireSession = useCallback(async (orgId: string) => {
    if (!orgId) return false;

    // Prevent multiple concurrent acquisitions for the same org
    if (acquisitionInProgressRef.current === orgId) {
      return false;
    }

    acquisitionInProgressRef.current = orgId;
    setSessionState(prev => ({ ...prev, isLoading: true, lastError: null }));

    try {
      const response = await fetch(`/api/organizations/${orgId}/session`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || 'Failed to create organization session');
      }

      const data = await response.json();
      
      setSessionState({
        isValid: true,
        sessionData: data.sessionData,
        isLoading: false,
        isRefreshing: false,
        lastError: null,
      });

      return true;
    } catch (error) {
      console.error('Failed to acquire org session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to authenticate with organization';
      
      setSessionState({
        isValid: false,
        sessionData: null,
        isLoading: false,
        isRefreshing: false,
        lastError: errorMessage,
      });

      return false;
    } finally {
      acquisitionInProgressRef.current = null;
    }
  }, []);

  // Verify existing session
  const verifySession = useCallback(async (orgId: string) => {
    if (!orgId) return false;

    try {
      const response = await fetch(`/api/organizations/${orgId}/session/verify`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Session verification failed');
      }

      const data = await response.json();
      
      if (data.valid) {
        setSessionState({
          isValid: true,
          sessionData: data.sessionData,
          isLoading: false,
          isRefreshing: false,
          lastError: null,
        });
        return true;
      } else {
        // Try to acquire new session
        return await acquireSession(orgId);
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      // Try to acquire new session as fallback
      return await acquireSession(orgId);
    }
  }, [acquireSession]);

  // Refresh session before expiry
  const refreshSession = useCallback(async () => {
    if (!sessionState.sessionData?.orgId) return false;

    setSessionState(prev => ({ ...prev, isRefreshing: true }));
    return await acquireSession(sessionState.sessionData.orgId);
  }, [sessionState.sessionData?.orgId, acquireSession]);

  // Clear session
  const clearSession = useCallback(async () => {
    if (sessionState.sessionData?.orgId) {
      try {
        await fetch(`/api/organizations/${sessionState.sessionData.orgId}/session`, {
          method: 'DELETE',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Failed to clear org session:', error);
      }
    }

    setSessionState({
      isValid: false,
      sessionData: null,
      isLoading: false,
      isRefreshing: false,
      lastError: null,
    });
  }, [sessionState.sessionData?.orgId]);

  // Auto-acquire session when organization changes
  useEffect(() => {
    if (currentOrganization?.id && !sessionState.isLoading) {
      verifySession(currentOrganization.id);
    }
  }, [currentOrganization?.id, verifySession, sessionState.isLoading]);

  // Auto-refresh session before expiry
  useEffect(() => {
    if (!sessionState.sessionData?.expiresAt || sessionState.isRefreshing) return;

    const expiresAt = sessionState.sessionData.expiresAt;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshTime = Math.max(timeUntilExpiry - (15 * 60 * 1000), 60 * 1000); // Refresh 15 min before expiry, but at least 1 min from now

    if (refreshTime > 0) {
      const timeoutId = setTimeout(() => {
        refreshSession();
      }, refreshTime);

      return () => clearTimeout(timeoutId);
    } else {
      // Session already expired or about to expire, refresh immediately
      refreshSession();
    }
  }, [sessionState.sessionData?.expiresAt, sessionState.isRefreshing, refreshSession]);

  // Handle authentication errors gracefully with structured responses
  const handleAuthError = useCallback((error: any) => {
    const errorData = error?.response?.data || error?.data || {};
    
    if (error?.status === 401 || errorData?.code?.includes('ORG_')) {
      setSessionState(prev => ({ ...prev, lastError: errorData.message || 'Session expired' }));
      
      if (errorData.code === 'ORG_TOKEN_EXPIRED' || errorData.code === 'ORG_SESSION_REQUIRED') {
        // Show user-friendly message instead of redirecting
        toast({
          title: "Session Refreshing",
          description: "Refreshing your organization access...",
          variant: "default",
        });

        // Try to refresh session
        if (currentOrganization?.id && !acquisitionInProgressRef.current) {
          acquireSession(currentOrganization.id);
        }
        
        return true; // Indicate we handled the error
      }
      
      if (errorData.code === 'AUTH_REQUIRED' && errorData.redirectToLogin) {
        // Only redirect on global auth failure
        return false;
      }
    }
    
    return false; // Let other errors bubble up
  }, [currentOrganization?.id, acquireSession, toast]);

  return {
    isValid: sessionState.isValid,
    sessionData: sessionState.sessionData,
    isLoading: sessionState.isLoading,
    isRefreshing: sessionState.isRefreshing,
    lastError: sessionState.lastError,
    acquireSession,
    verifySession,
    refreshSession,
    clearSession,
    handleAuthError,
  };
}