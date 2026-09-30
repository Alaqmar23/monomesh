import api from './api';
import { ProjectSummary, ProjectImage, ViewCoverageResult, ViewRecommendationResult, ReconstructionResult } from '../types';

export interface ProjectDetailResponse {
  project: {
    id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
    image_count: number;
    status: string;
  };
  images: ProjectImage[];
  view_analysis: ViewCoverageResult | null;
  view_recommendation: ViewRecommendationResult | null;
  latest_reconstruction: ReconstructionResult | null;
}

export const projectService = {
  async getProjects(): Promise<ProjectSummary[]> {
    return api.get('/projects');
  },

  async createProject(name: string, description?: string): Promise<ProjectSummary> {
    return api.post('/projects', { name, description });
  },

  async getProject(projectId: string): Promise<ProjectDetailResponse> {
    return api.get(`/projects/${projectId}`);
  },

  async deleteProject(projectId: string): Promise<{ deleted: boolean; project_id: string }> {
    return api.delete(`/projects/${projectId}`);
  },

  async uploadImages(projectId: string, files: File[]): Promise<{ uploaded_count: number; total_images: number; images: ProjectImage[] }> {
    const formData = new FormData();
    formData.append('project_id', projectId);
    files.forEach((file) => formData.append('files', file));
    return api.post('/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async deleteImage(imageId: string): Promise<{ deleted: boolean; image_id: string; remaining_count: number }> {
    return api.delete(`/images/${imageId}`);
  }
};
