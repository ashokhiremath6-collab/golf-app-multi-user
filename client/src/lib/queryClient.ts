import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Add cache busting to force fresh data
    const url = queryKey.join("/") as string;
    const separator = url.includes('?') ? '&' : '?';
    const cacheBustUrl = `${url}${separator}_t=${Date.now()}`;
    
    const res = await fetch(cacheBustUrl, {
      credentials: "include",
      cache: "no-cache", // Force no browser caching
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Enable refetch on focus
      staleTime: 0, // FORCE IMMEDIATE REFRESH - No caching
      cacheTime: 0, // Don't cache at all
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
