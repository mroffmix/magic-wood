<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  difficulty: {
    type: String,
    required: true
  }
});

// Map difficulty to a numeric value for color mapping
const difficultyValue = computed(() => {
  const difficultyMap: { [key: string]: number } = {
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

  // Normalize difficulty: take the part before '/' or '-' (if present), uppercase, remove spaces
  const normalizedDifficulty = props.difficulty.split(/[/\-]/)[0].toUpperCase().replace(/\s/g, '');
  
  return difficultyMap[normalizedDifficulty] || 0;
});

// Calculate background color based on difficulty
const backgroundColor = computed(() => {
  if (!difficultyValue.value) return '#777'; // Default gray for unknown values
  
  // 5A is 25, 6A is 31, 6C+ is 36, 7A is 37, 7C+ is 42
  if (difficultyValue.value < 25) {
    // Green (up to 5A)
    return 'rgb(0, 180, 0)';
  } else if (difficultyValue.value < 31) {
    // Yellow (5A to 6A)
    return 'rgb(255, 210, 0)';
  } else if (difficultyValue.value < 37) {
    // Orange (6A to 6C+)
    return 'rgb(255, 140, 0)';
  } else if (difficultyValue.value < 43) {
    // Red (7A to 7C+)
    return 'rgb(230, 30, 30)';
  } else {
    // Purple (8A and above)
    return 'rgb(150, 30, 220)';
  }
});

// Calculate text color (white for darker backgrounds, black for lighter ones)
const textColor = computed(() => {
  if (!difficultyValue.value) return '#fff';
  
  // Use white text for darker grades (orange, red, purple)
  return difficultyValue.value >= 31 ? '#fff' : '#000';
});
</script>

<template>
  <div class="difficulty-label" :style="{ 
    backgroundColor: backgroundColor,
    color: textColor
  }">
    {{ difficulty }}
  </div>
</template>

<style scoped>
.difficulty-label {
  display: inline-block;
  padding: 4px 4px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 14px;
  min-width: 36px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Desktop-specific styles */
@media (min-width: 768px) {
  .difficulty-label {
    padding: 2px 8px;
    font-size: 12px;
    min-width: 42px;
    border-radius: 5px;
  }
}
</style>
