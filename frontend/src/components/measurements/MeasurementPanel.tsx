import React, { useState } from 'react';
import { Ruler, CheckCircle2, AlertTriangle, Scale, Box } from 'lucide-react';
import { Point3D, DistanceMeasurement, CalibrationResult } from '../../types';
import { measurementService } from '../../services/measurementService';

interface MeasurementPanelProps {
  projectId: string;
  reconstructionId?: string;
  pointA: Point3D | null;
  pointB: Point3D | null;
  onClearPoints: () => void;
  onMeasurementCalculated: (distStr: string) => void;
}

export const MeasurementPanel: React.FC<MeasurementPanelProps> = ({
  projectId,
  reconstructionId,
  pointA,
  pointB,
  onClearPoints,
  onMeasurementCalculated,
}) => {
  const [distanceInfo, setDistanceInfo] = useState<DistanceMeasurement | null>(null);
  const [calibrationInfo, setCalibrationInfo] = useState<CalibrationResult | null>(null);
  const [knownDist, setKnownDist] = useState<number>(10.0);
  const [knownUnit, setKnownUnit] = useState<string>('cm');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute distance when both points are picked
  React.useEffect(() => {
    if (pointA && pointB) {
      measurementService.measureDistance({
        project_id: projectId,
        reconstruction_id: reconstructionId,
        point_a: pointA,
        point_b: pointB,
        calibration_factor: calibrationInfo?.scale_factor,
        unit: calibrationInfo?.unit || 'units'
      }).then((res) => {
        setDistanceInfo(res);
        const label = res.is_calibrated && res.calibrated_distance !== null
          ? `${res.calibrated_distance} ${res.unit}`
          : `${res.raw_distance} units`;
        onMeasurementCalculated(label);
      }).catch((err) => {
        setErrorMsg(err.message);
      });
    } else {
      setDistanceInfo(null);
    }
  }, [pointA, pointB, calibrationInfo]);

  const handleCalibrate = async () => {
    if (!pointA || !pointB) {
      setErrorMsg("Please select two points on the 3D model to calibrate scale.");
      return;
    }
    setIsCalibrating(true);
    setErrorMsg(null);
    try {
      const res = await measurementService.calibrateScale({
        project_id: projectId,
        reconstruction_id: reconstructionId,
        point_a: pointA,
        point_b: pointB,
        known_distance: knownDist,
        known_unit: knownUnit
      });
      setCalibrationInfo(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Scale calibration failed.");
    } finally {
      setIsCalibrating(false);
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-surface-border space-y-4">
      <div className="flex items-center justify-between border-b border-surface-border pb-3">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">3D Surface Measurement & Calibration</h3>
        </div>
        {(pointA || pointB) && (
          <button
            onClick={onClearPoints}
            className="text-xs text-slate-400 hover:text-white underline transition-colors"
          >
            Clear Points
          </button>
        )}
      </div>

      {/* Point coordinates feedback */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-2.5 rounded-xl bg-black/30 border border-surface-border">
          <div className="text-slate-400 mb-1 flex items-center justify-between">
            <span>Point A:</span>
            {pointA && <span className="text-[10px] text-accent-cyan">Selected</span>}
          </div>
          {pointA ? (
            <div className="text-slate-200">
              X: {pointA.x} | Y: {pointA.y} | Z: {pointA.z}
            </div>
          ) : (
            <div className="text-slate-400 italic">Click on model surface</div>
          )}
        </div>

        <div className="p-2.5 rounded-xl bg-black/30 border border-surface-border">
          <div className="text-slate-400 mb-1 flex items-center justify-between">
            <span>Point B:</span>
            {pointB && <span className="text-[10px] text-purple-400">Selected</span>}
          </div>
          {pointB ? (
            <div className="text-slate-200">
              X: {pointB.x} | Y: {pointB.y} | Z: {pointB.z}
            </div>
          ) : (
            <div className="text-slate-400 italic">Click second point</div>
          )}
        </div>
      </div>

      {/* Distance Result */}
      {distanceInfo && (
        <div className="p-3.5 rounded-xl bg-surface/90 border border-surface-border space-y-1.5">
          <div className="text-xs text-slate-400 font-mono">Calculated Euclidean Distance:</div>
          <div className="text-lg font-bold font-mono text-amber-400 flex items-baseline gap-2">
            <span>
              {distanceInfo.is_calibrated && distanceInfo.calibrated_distance !== null
                ? distanceInfo.calibrated_distance
                : distanceInfo.raw_distance}
            </span>
            <span className="text-xs text-slate-300 font-normal">{distanceInfo.unit}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            {distanceInfo.is_calibrated ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Calibrated against reference scale
              </span>
            ) : (
              <span className="text-amber-400/90 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Scale is uncalibrated. Relative model units shown.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Scale Calibration Section */}
      <div className="pt-2 border-t border-surface-border space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Scale className="w-3.5 h-3.5 text-brand-400" />
          <span>Real-World Scale Calibration</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={knownDist}
            onChange={(e) => setKnownDist(parseFloat(e.target.value) || 1.0)}
            className="w-24 bg-black/40 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
            placeholder="10.0"
          />
          <select
            value={knownUnit}
            onChange={(e) => setKnownUnit(e.target.value)}
            className="bg-black/40 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-brand-500"
          >
            <option value="cm">cm</option>
            <option value="mm">mm</option>
            <option value="m">meters</option>
            <option value="in">inches</option>
          </select>
          <button
            onClick={handleCalibrate}
            disabled={!pointA || !pointB || isCalibrating}
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            {isCalibrating ? 'Calibrating...' : 'Calibrate Scale'}
          </button>
        </div>

        {/* Calibrated Bounding Box Dimensions */}
        {calibrationInfo?.bounding_box && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono space-y-1">
            <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5" /> Calibrated Bounding Dimensions:
            </div>
            <div className="grid grid-cols-3 gap-2 text-slate-300 pt-1">
              <div>W: <span className="font-bold text-white">{calibrationInfo.bounding_box.width}</span> {calibrationInfo.unit}</div>
              <div>H: <span className="font-bold text-white">{calibrationInfo.bounding_box.height}</span> {calibrationInfo.unit}</div>
              <div>D: <span className="font-bold text-white">{calibrationInfo.bounding_box.depth}</span> {calibrationInfo.unit}</div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="text-xs text-rose-400 font-mono bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
};
