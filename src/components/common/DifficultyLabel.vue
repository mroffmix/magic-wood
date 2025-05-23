<script setup lang="ts">
import { computed } from 'vue';
import { getDifficultyValue, getDifficultyColor, getDifficultyTextColor } from '@/utils/difficulty';

const props = defineProps({
  difficulty: {
    type: String,
    required: true
  }
});

// Get numeric value for the difficulty
const difficultyValue = computed(() => {
  return getDifficultyValue(props.difficulty);
});

// Calculate background color based on difficulty
const backgroundColor = computed(() => {
  return getDifficultyColor(difficultyValue.value);
});

// Calculate text color (white for darker backgrounds, black for lighter ones)
const textColor = computed(() => {
  return getDifficultyTextColor(difficultyValue.value);
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
