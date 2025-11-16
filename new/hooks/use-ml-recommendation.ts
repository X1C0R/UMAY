// Hook for ML Learning Mode Recommendation
import { useState, useEffect } from 'react';
import { getRecommendedMode, MLRecommendation } from '../lib/ml-service';

interface UseMLRecommendationResult {
  recommendation: MLRecommendation | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get ML-recommended learning mode
 */
export function useMLRecommendation(subject?: string): UseMLRecommendationResult {
  const [recommendation, setRecommendation] = useState<MLRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendation = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getRecommendedMode(subject);
      setRecommendation(result);
    } catch (err: any) {
      setError(err.message || 'Failed to get recommendation');
      console.error('ML Recommendation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendation();
  }, [subject]);

  return {
    recommendation,
    loading,
    error,
    refetch: fetchRecommendation,
  };
}


