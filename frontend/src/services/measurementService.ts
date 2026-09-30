import api from './api';
import { Point3D, DistanceMeasurement, CalibrationResult } from '../types';

export const measurementService = {
  async measureDistance(params: {
    project_id: string;
    reconstruction_id?: string;
    point_a: Point3D;
    point_b: Point3D;
    calibration_factor?: number;
    unit?: string;
  }): Promise<DistanceMeasurement> {
    return api.post('/measurements', params);
  },

  async calibrateScale(params: {
    project_id: string;
    reconstruction_id?: string;
    point_a: Point3D;
    point_b: Point3D;
    known_distance: number;
    known_unit?: string;
  }): Promise<CalibrationResult> {
    return api.post('/measurements/calibrate', params);
  }
};
