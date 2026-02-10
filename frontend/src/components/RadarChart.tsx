import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { RadarData } from '../types';

interface RadarChartProps {
  data: RadarData[];
  width?: number;
  height?: number;
}

export default function RadarChartComponent({ data, width = 400, height = 400 }: RadarChartProps) {
  if (data.length === 0) {
    return null;
  }

  return (
    <ResponsiveContainer width={width} height={height}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#1976d2"
          fill="#1976d2"
          fillOpacity={0.6}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}


