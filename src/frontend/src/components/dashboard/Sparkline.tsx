import { cn } from "@/lib/utils";
import { useMemo } from "react";

export interface SparklineProps {
	data: number[];
	width?: number;
	height?: number;
	color?: string;
	fillColor?: string;
	className?: string;
	showDots?: boolean;
}

export function Sparkline({
	data,
	width = 100,
	height = 30,
	color = "stroke-gt-accent",
	fillColor = "fill-gt-accent/10",
	className,
	showDots = false,
}: SparklineProps) {
	const { path, fillPath, dots } = useMemo(() => {
		if (data.length === 0) {
			return { path: "", fillPath: "", dots: [] };
		}

		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;

		const points = data.map((value, index) => {
			const x = (index / (data.length - 1)) * width;
			const y = height - ((value - min) / range) * height;
			return { x, y, value };
		});

		const path = points
			.map((point, i) => `${i === 0 ? "M" : "L"} ${point.x},${point.y}`)
			.join(" ");

		const fillPath = `${path} L ${width},${height} L 0,${height} Z`;

		return { path, fillPath, dots: points };
	}, [data, width, height]);

	if (data.length === 0) {
		return (
			<div
				className={cn("flex items-center justify-center text-xs text-gt-text/50", className)}
				style={{ width, height }}
			>
				No data
			</div>
		);
	}

	return (
		<svg
			width={width}
			height={height}
			className={cn("overflow-visible", className)}
			viewBox={`0 0 ${width} ${height}`}
		>
			{/* Fill area under the line */}
			<path d={fillPath} className={fillColor} />

			{/* Line */}
			<path
				d={path}
				className={cn(color, "fill-none")}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>

			{/* Dots at data points */}
			{showDots &&
				dots.map((dot, i) => (
					<circle
						key={i}
						cx={dot.x}
						cy={dot.y}
						r="2"
						className={cn(color.replace("stroke-", "fill-"))}
					/>
				))}
		</svg>
	);
}
