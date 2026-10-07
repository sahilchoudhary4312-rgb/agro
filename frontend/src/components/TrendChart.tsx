import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { inr } from "./ui";

export function TrendChart({
  data,
  height = 220,
  color = "#1c5d37",
  dashed = false,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  dashed?: boolean;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            width={56}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
          />
          <Tooltip
            formatter={(v) => [inr(Number(v), 2), "Price"]}
            labelStyle={{ fontWeight: 700, color: "#1f2937" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            strokeDasharray={dashed ? "6 4" : undefined}
            dot={data.length <= 20 ? { r: 2.5, fill: color } : false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
