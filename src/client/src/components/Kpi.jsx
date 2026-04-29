import { Spark } from './Spark';

export function Kpi({ label, value, unit, delta, deltaKind = 'ok', spark }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {delta && <div className={`kpi-delta ${deltaKind === 'ok' ? '' : deltaKind}`}>{delta}</div>}
      {spark && <Spark data={spark} />}
    </div>
  );
}
