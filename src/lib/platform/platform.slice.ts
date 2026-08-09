import { api } from '@/utils/axios'
import { useQuery } from '@tanstack/react-query'

export interface PlatformStats {
  instructorCount: number
  trackCount: number
  lessonCount: number
}

/**
 * Public counts shown on the auth panel.
 *
 * Unauthenticated on purpose — the numbers are what convince someone to create
 * an account, so they cannot sit behind a session.
 */
export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<PlatformStats>('/api/platform/stats')
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}
