import { existsSync } from "fs";
import { join, dirname } from "path";

let cachedTownRoot: string | null = null;

/**
 * Check if a directory is a Gas Town workspace.
 * Gas Town v2 uses mayor/town.json to identify a workspace.
 */
function isTownRoot(dir: string): boolean {
	return existsSync(join(dir, "mayor", "town.json"));
}

/**
 * Find Gas Town root directory.
 * Priority:
 * 1. GT_TOWN_ROOT environment variable
 * 2. Walk up from cwd looking for mayor/town.json
 * 3. Return null if not found
 */
export function findTownRoot(): string | null {
	if (cachedTownRoot) return cachedTownRoot;

	// Check environment variable first
	const envRoot = process.env.GT_TOWN_ROOT;
	if (envRoot && isTownRoot(envRoot)) {
		cachedTownRoot = envRoot;
		return cachedTownRoot;
	}

	// Walk up from cwd
	let current = process.cwd();
	const root = dirname(current);

	while (current !== root) {
		if (isTownRoot(current)) {
			cachedTownRoot = current;
			return cachedTownRoot;
		}
		current = dirname(current);
	}

	return null;
}

export function getTownRoot(): string {
	const root = findTownRoot();
	if (!root) {
		throw new Error(
			"Gas Town root not found. Set GT_TOWN_ROOT env var or run from within a Gas Town project.",
		);
	}
	return root;
}

export function clearTownRootCache(): void {
	cachedTownRoot = null;
}
