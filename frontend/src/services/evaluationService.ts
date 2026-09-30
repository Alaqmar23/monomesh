import api from './api';
import { EvaluationResult, ExperimentData } from '../types';

export const evaluationService = {
  async evaluateProject(projectId: string, reconstructionId?: string, groundTruthFilename?: string): Promise<EvaluationResult> {
    return api.post('/evaluation', {
      project_id: projectId,
      reconstruction_id: reconstructionId,
      ground_truth_filename: groundTruthFilename
    });
  },

  async getLatestEvaluation(projectId: string): Promise<EvaluationResult | null> {
    return api.get(`/evaluation/${projectId}`);
  },

  async runScalingExperiment(datasetName?: string): Promise<ExperimentData> {
    const formData = new FormData();
    if (datasetName) formData.append('dataset_name', datasetName);
    return api.post('/experiments/run', formData);
  },

  async getExperiments(): Promise<ExperimentData[]> {
    return api.get('/experiments');
  }
};
