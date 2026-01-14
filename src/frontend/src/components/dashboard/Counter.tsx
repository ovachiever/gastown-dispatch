import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export interface CounterProps {
	value: number;
	duration?: number;
	className?: string;
	prefix?: string;
	suffix?: string;
}

export function Counter({
	value,
	duration = 1000,
	className,
	prefix = "",
	suffix = "",
}: CounterProps) {
	const [displayValue, setDisplayValue] = useState(0);

	useEffect(() => {
		let startTime: number | null = null;
		let animationFrame: number;

		const animate = (currentTime: number) => {
			if (!startTime) startTime = currentTime;
			const progress = Math.min((currentTime - startTime) / duration, 1);

			const easeOutQuad = (t: number) => t * (2 - t);
			const easedProgress = easeOutQuad(progress);

			setDisplayValue(Math.round(easedProgress * value));

			if (progress < 1) {
				animationFrame = requestAnimationFrame(animate);
			}
		};

		animationFrame = requestAnimationFrame(animate);

		return () => {
			if (animationFrame) {
				cancelAnimationFrame(animationFrame);
			}
		};
	}, [value, duration]);

	return (
		<span className={cn("font-mono font-bold", className)}>
			{prefix}
			{displayValue.toLocaleString()}
			{suffix}
		</span>
	);
}
