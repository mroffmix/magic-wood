/**
 * Centralized difficulty system for boulder climbing grades
 * Provides a unified mapping of V-scale/Font scale boulder grades to numeric values
 * and related utility functions for difficulty operations.
 */

/**
 * Map of difficulty labels to numeric values
 * Higher numbers represent harder difficulties
 */
export const difficultyMap: { [key: string]: number } = {
  '1A': 1, '1A+': 2, '1B': 3, '1B+': 4, '1C': 5, '1C+': 6,
  '2A': 7, '2A+': 8, '2B': 9, '2B+': 10, '2C': 11, '2C+': 12,
  '3A': 13, '3A+': 14, '3B': 15, '3B+': 16, '3C': 17, '3C+': 18,
  '4A': 19, '4A+': 20, '4B': 21, '4B+': 22, '4C': 23, '4C+': 24,
  '5A': 25, '5A+': 26, '5B': 27, '5B+': 28, '5C': 29, '5C+': 30,
  '6A': 31, '6A+': 32, '6B': 33, '6B+': 34, '6C': 35, '6C+': 36,
  '7A': 37, '7A+': 38, '7B': 39, '7B+': 40, '7C': 41, '7C+': 42,
  '8A': 43, '8A+': 44, '8B': 45, '8B+': 46, '8C': 47, '8C+': 48,
  '9A': 49, '9A+': 50, '9B': 51, '9B+': 52, '9C': 53
};

/**
 * Array of all difficulty labels sorted by difficulty (easiest to hardest)
 */
export const difficultyOptions = Object.keys(difficultyMap);

/**
 * Get the numeric value for a difficulty label
 * @param difficulty - The difficulty label (e.g., "7A", "6B+")
 * @returns The numeric value or 0 if not found
 */
export function getDifficultyValue(difficulty: string): number {
  if (!difficulty) return 0;
  
  // Normalize difficulty: take the part before '/' or '-' (if present), uppercase, remove spaces
  const normalizedDifficulty = difficulty.split(/[/-]/)[0].toUpperCase().replace(/\s/g, '');
  
  return difficultyMap[normalizedDifficulty] || 0;
}

/**
 * Get the difficulty label for a numeric value
 * @param value - The numeric difficulty value
 * @returns The difficulty label or undefined if not found
 */
export function getDifficultyLabel(value: number): string | undefined {
  return difficultyOptions.find(label => difficultyMap[label] === value);
}

/**
 * Compare two difficulty labels for sorting
 * @param a - First difficulty label
 * @param b - Second difficulty label
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function compareDifficulties(a: string, b: string): number {
  return getDifficultyValue(a) - getDifficultyValue(b);
}

/**
 * Sort an array of difficulty labels from easiest to hardest
 * @param difficulties - Array of difficulty labels
 * @returns Sorted array of difficulty labels
 */
export function sortDifficulties(difficulties: string[]): string[] {
  return [...difficulties].sort(compareDifficulties);
}

/**
 * Check if a difficulty label is valid
 * @param difficulty - The difficulty label to validate
 * @returns True if the difficulty is valid
 */
export function isValidDifficulty(difficulty: string): boolean {
  return getDifficultyValue(difficulty) > 0;
}

/**
 * Get the color for a difficulty grade based on numeric value
 * @param difficultyValue - The numeric difficulty value
 * @returns CSS color string
 */
export function getDifficultyColor(difficultyValue: number): string {
  if (!difficultyValue) return '#777'; // Default gray for unknown values
  
  if (difficultyValue < 25) {
    // Green (up to 5A)
    return 'rgb(0, 180, 0)';
  } else if (difficultyValue < 31) {
    // Yellow (5A to 6A)
    return 'rgb(255, 210, 0)';
  } else if (difficultyValue < 37) {
    // Orange (6A to 6C+)
    return 'rgb(255, 140, 0)';
  } else if (difficultyValue < 43) {
    // Red (7A to 7C+)
    return 'rgb(230, 30, 30)';
  } else {
    // Purple (8A and above)
    return 'rgb(150, 30, 220)';
  }
}

/**
 * Get the appropriate text color for a difficulty grade
 * @param difficultyValue - The numeric difficulty value
 * @returns CSS color string ('white' or 'black')
 */
export function getDifficultyTextColor(difficultyValue: number): string {
  if (!difficultyValue) return '#fff';
  
  // Use white text for darker grades (orange, red, purple)
  return difficultyValue >= 31 ? '#fff' : '#000';
}

/**
 * Filter routes by difficulty range
 * @param routes - Array of routes with difficulty property
 * @param minDifficulty - Minimum difficulty label
 * @param maxDifficulty - Maximum difficulty label
 * @returns Filtered array of routes
 */
export function filterRoutesByDifficulty<T extends { difficulty: string }>(
  routes: T[],
  minDifficulty: string,
  maxDifficulty: string
): T[] {
  const minValue = getDifficultyValue(minDifficulty);
  const maxValue = getDifficultyValue(maxDifficulty);
  
  return routes.filter(route => {
    const routeValue = getDifficultyValue(route.difficulty);
    return routeValue >= minValue && routeValue <= maxValue;
  });
}