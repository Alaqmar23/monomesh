import api from './api';
import { ReconstructionJobStatus, ReconstructionResult } from '../types';

export interface StartReconstructionParams {
  project_id: string;
  engine?: string;
  quality?: string;
  output_format?: string;
  refinement?: string;
}

export const reconstructionService = {
  async startReconstruction(params: StartReconstructionParams): Promise<{ job_id: string; status: string }> {
    return api.post('/reconstruction', params);
  },

  async getStatus(jobId: string): Promise<ReconstructionJobStatus> {
    return api.get(`/reconstruction/${jobId}/status`);
  },

  async getResult(jobId: string): Promise<ReconstructionResult> {
    return api.get(`/reconstruction/${jobId}/result`);
  }
};
