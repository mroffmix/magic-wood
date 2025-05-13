<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import DifficultyLabel from '@/components/common/DifficultyLabel.vue';

const props = defineProps({
  minDifficulty: {
    type: String,
    default: '2B'
  },
  maxDifficulty: {
    type: String,
    default: '8C'
  }
});

const emit = defineEmits(['update:minDifficulty', 'update:maxDifficulty']);

// State for filter visibility
const isFilterVisible = ref(true);

// Map difficulty to a numeric value for filtering and color mapping
const difficultyMap: { [key: string]: number } = {
  '2B': 9, '2B+': 10, '2C': 11, '2C+': 12,
  '3A': 13, '3A+': 14, '3B': 15, '3B+': 16, '3C': 17, '3C+': 18,
  '4A': 19, '4A+': 20, '4B': 21, '4B+': 22, '4C': 23, '4C+': 24,
  '5A': 25, '5A+': 26, '5B': 27, '5B+': 28, '5C': 29, '5C+': 30,
  '6A': 31, '6A+': 32, '6B': 33, '6B+': 34, '6C': 35, '6C+': 36,
  '7A': 37, '7A+': 38, '7B': 39, '7B+': 40, '7C': 41, '7C+': 42,
  '8A': 43, '8A+': 44, '8B': 45, '8B+': 46, '8C': 47, '8C+': 48
};

// Create an array of difficulty labels for the range
const difficultyOptions = Object.keys(difficultyMap);

// Numeric values for the sliders
const minSliderValue = ref(difficultyMap[props.minDifficulty] || 9);
const maxSliderValue = ref(difficultyMap[props.maxDifficulty] || 48);

// Convert slider values to difficulties
const minDifficultyValue = computed(() => {
  return difficultyOptions.find(d => difficultyMap[d] === minSliderValue.value) || '2B';
});

const maxDifficultyValue = computed(() => {
  return difficultyOptions.find(d => difficultyMap[d] === maxSliderValue.value) || '8C';
});

// Get color for a specific difficulty grade
const getDifficultyColor = (value: number) => {
  if (value < 25) {
    // Green (up to 5A)
    return 'rgb(0, 180, 0)';
  } else if (value < 31) {
    // Yellow (5A to 6A)
    return 'rgb(255, 210, 0)';
  } else if (value < 37) {
    // Orange (6A to 6C+)
    return 'rgb(255, 140, 0)';
  } else if (value < 43) {
    // Red (7A to 7C+)
    return 'rgb(230, 30, 30)';
  } else {
    // Purple (8A and above)
    return 'rgb(150, 30, 220)';
  }
};

// Watch for changes and emit events
watch(minSliderValue, (newValue) => {
  // Ensure min doesn't exceed max
  if (newValue > maxSliderValue.value) {
    maxSliderValue.value = newValue;
  }
  emit('update:minDifficulty', minDifficultyValue.value);
});

watch(maxSliderValue, (newValue) => {
  // Ensure max isn't below min
  if (newValue < minSliderValue.value) {
    minSliderValue.value = newValue;
  }
  emit('update:maxDifficulty', maxDifficultyValue.value);
});

const toggleFilterVisibility = () => {
  isFilterVisible.value = !isFilterVisible.value;
};

// Compute styles for the range slider track (colored section)
const rangeTrackStyle = computed(() => {
  const min = minSliderValue.value;
  const max = maxSliderValue.value;
  const range = 53; // Maximum value in difficultyMap
  const left = (min / range) * 100;
  const width = ((max - min) / range) * 100;
  
  return {
    left: `${left}%`,
    width: `${width}%`,
    background: `linear-gradient(to right, 
      ${getDifficultyColor(min)}, 
      ${getDifficultyColor(Math.floor((min + max) / 2))}, 
      ${getDifficultyColor(max)})`
  };
});

onMounted(() => {
  // Normalize initial values
  if (props.minDifficulty) {
    minSliderValue.value = difficultyMap[props.minDifficulty] || 9;
  }
  if (props.maxDifficulty) {
    maxSliderValue.value = difficultyMap[props.maxDifficulty] || 48;
  }
});
</script>

<template>
  <div class="difficulty-filter-container">
    <!-- <button class="toggle-filter-btn" @click="toggleFilterVisibility">
      {{ isFilterVisible ? '▼' : '▲' }} 
    </button> -->
    
    <div v-if="isFilterVisible" class="difficulty-filter">
      <div class="slider-container">
        <!-- Min selector with dynamic color -->
        <select 
          v-model="minSliderValue" 
          class="difficulty-select"
          :style="{ backgroundColor: getDifficultyColor(minSliderValue), color: minSliderValue >= 31 ? 'white' : 'black' }"
        >
          <option v-for="option in difficultyOptions" 
                  :key="option"
                  :value="difficultyMap[option]"
                  :disabled="difficultyMap[option] > maxSliderValue">
            {{ option }}
          </option>
        </select>
        
        <!-- Visual range bar in the middle -->
        <div class="range-visual">
          <div class="range-bar">
            <div class="range-fill" :style="rangeTrackStyle"></div>
          </div>
        </div>
        
        <!-- Max selector with dynamic color -->
        <select 
          v-model="maxSliderValue" 
          class="difficulty-select"
          :style="{ backgroundColor: getDifficultyColor(maxSliderValue), color: maxSliderValue >= 31 ? 'white' : 'black' }"
        >
          <option v-for="option in difficultyOptions" 
                  :key="option"
                  :value="difficultyMap[option]"
                  :disabled="difficultyMap[option] < minSliderValue">
            {{ option }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.difficulty-filter-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* padding-bottom: 40px; */
}

.toggle-filter-btn {
  background-color: rgba(50, 50, 50, 0.8);
  color: white;
  border: none;
  border-radius: 8px 8px 0 0;
  padding: 8px 20px; /* Increased padding for better touch target */
  font-size: 14px; /* Larger font size */
  cursor: pointer;
  z-index: 1;
  min-width: 150px; /* Minimum width for button */
}

.toggle-filter-btn:hover {
  background-color: rgba(70, 70, 70, 0.9);
}

.difficulty-filter {
  background-color: rgba(50, 50, 50, 0.8);
  border-radius: 8px 8px 0 0;
  padding: 20px 15px;
  width: 100%;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.2);
}

.slider-container {
  display: flex;
  flex-direction: row;
  width: 100%;
  gap: 15px;
  align-items: center;
  justify-content: space-between; /* Ensure items are spaced evenly */
}

.filter-control {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.difficulty-select {
  background-color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 14px;
  font-weight: bold;
  width: 70px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  flex: 0 0 auto; /* Prevent select from growing or shrinking */
}

.difficulty-select::after {
  content: "▼";
  font-size: 10px;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.difficulty-select:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
}

.range-visual {
  flex: 1;
  min-width: 80px; /* Ensure it has some minimum width */
}

.range-bar {
  height: 20px;
  background-color: #ddd;
  border-radius: 4px;
  position: relative;
  width: 100%;
}

.range-fill {
  position: absolute;
  height: 100%;
  border-radius: 4px;
}

@media (min-width: 600px) {
  .slider-container {
    flex-direction: row;
    align-items: center;
  }
  
  .range-visual {
    flex: 1;
  }
}

@media (max-width: 768px) {
  .difficulty-filter {
    padding: 15px 10px; /* Slightly smaller padding on mobile */
  }
  
  .slider-container {
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .slider-container {
    flex-wrap: nowrap; /* Ensure it doesn't wrap */
    gap: 6px; /* Reduce gap on small screens */
  }
  
  .difficulty-select {
    width: 55px; /* Make selects a bit smaller */
    padding: 4px 4px;
    font-size: 12px;
  }
  
  .range-visual {
    order: unset; /* Remove the order property */
    margin-top: 0; /* Remove the top margin */
    min-width: 40px; /* Allow smaller minimum width on mobile */
  }
  
  .range-bar {
    height: 6px; /* Make the bar slightly smaller on mobile */
  }
  
  .toggle-filter-btn {
    width: 100%; /* Full width button on very small screens */
    border-radius: 0;
  }
  
  .difficulty-filter {
    border-radius: 0;
  }
}
</style>
