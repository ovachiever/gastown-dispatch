import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "open":
      return "text-blue-400";
    case "in_progress":
    case "hooked":
      return "text-amber-400";
    case "closed":
      return "text-green-400";
    default:
      return "text-gray-400";
  }
}

export function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 0:
      return "Critical";
    case 1:
      return "High";
    case 2:
      return "Medium";
    case 3:
      return "Low";
    case 4:
      return "Backlog";
    default:
      return `P${priority}`;
  }
}

export function getPriorityColor(priority: number): string {
  switch (priority) {
    case 0:
      return "text-red-400";
    case 1:
      return "text-orange-400";
    case 2:
      return "text-yellow-400";
    case 3:
      return "text-green-400";
    case 4:
      return "text-gray-400";
    default:
      return "text-gray-400";
  }
}
