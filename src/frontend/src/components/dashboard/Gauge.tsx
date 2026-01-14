import { cn } from "@/lib/utils";
import { useMemo } from "react";

export interface GaugeProps {
	value: number;
	max?: number;
	size?: number;
	thickness?: number;
	color?: string;
	backgroundColor?: string;
	showValue?: boolean;
	label?: string;
	className?: string;
}

export function Gauge({
	value,
	max = 100,
	size = 120,
	thickness = 12,
	color = "stroke-gt-accent",
	backgroundColor = "stroke-gt-text/10",
	showValue = true,
	label,
	className,
}: GaugeProps) {
	const { percentage, strokeDasharray, strokeDashoffset } = useMemo(() => {
		const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
		const radius = (size - thickness) / 2;
		const circumference = 2 * Math.PI * radius;
		const strokeDashoffset = circumference - (percentage / 100) * circumference;

		return {
			percentage,
			strokeDasharray: circumference,
			strokeDashoffset,
		};
	}, [value, max, size, thickness]);

	const radius = (size - thickness) / 2;
	const center = size / 2;

	const getColor = () => {
		if (percentage >= 90) return "stroke-red-500";
		if (percentage >= 70) return "stroke-yellow-500";
		return color;
	};

	const displayColor = getColor();

	return (
		<div className={cn("inline-flex flex-col items-center gap-2", className)}>
			<div className="relative" style={{ width: size, height: size }}>
				<svg
					width={size}
					height={size}
					className="transform -rotate-90"
					viewBox={`0 0 ${size} ${size}`}
				>
					{/* Background circle */}
					<circle
						cx={center}
						cy={center}
						r={radius}
						className={cn(backgroundColor, "fill-none")}
						strokeWidth={thickness}
					/>

					{/* Progress circle */}
					<circle
						cx={center}
						cy={center}
						r={radius}
						className={cn(displayColor, "fill-none transition-all duration-500 ease-out")}
						strokeWidth={thickness}
						strokeDasharray={strokeDasharray}
						strokeDashoffset={strokeDashoffset}
						strokeLinecap="round"
					/>
				</svg>

				{/* Center text */}
				{showValue && (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-center">
							<div className="text-2xl font-bold text-gt-text">
								{Math.round(percentage)}%
							</div>
							{label && <div className="text-xs text-gt-text/60">{label}</div>}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
