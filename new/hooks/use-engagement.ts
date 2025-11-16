// Hook for Engagement Analysis
import { useState, useEffect } from 'react';
import { analyzeEngagement, EngagementAnalysis } from '../lib/ml-service';

interface UseEngagementResult {
  engagement: EngagementAnalysis | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to analyze user engagement
 */
export function useEngagement(days: number = 7): UseEngagementResult {
  const [engagement, setEngagement] = useState<EngagementAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEngagement = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await analyzeEngagement(days);
      setEngagement(result);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze engagement');
      console.error('Engagement analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEngagement();
  }, [days]);

  return {
    engagement,
    loading,
    error,
    refetch: fetchEngagement,
  };
}


