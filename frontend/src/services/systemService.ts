import api from './api';
import { SystemStatus } from '../types';

export const systemService = {
  async getStatus(): Promise<SystemStatus> {
    return api.get('/system/status');
  }
};
