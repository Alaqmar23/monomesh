import api from './api';
import { ImageQualitySummary, ViewCoverageResult, ViewRecommendationResult } from '../types';

export const analysisService = {
  async analyzeImages(projectId: string): Promise<ImageQualitySummary> {
    return api.post('/images/analyze', { project_id: projectId });
  },

  async analyzeViewCoverage(projectId: string): Promise<ViewCoverageResult> {
    return api.post('/views/analyze', { project_id: projectId });
  },

  async getRecommendation(projectId: string): Promise<ViewRecommendationResult> {
    return api.post('/views/recommend', { project_id: projectId });
  }
};
