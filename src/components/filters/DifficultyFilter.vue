<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { difficultyMap, difficultyOptions, getDifficultyColor } from '@/utils/difficulty';
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

// Filter difficulty options to only show the range needed for the filter
const filterDifficultyOptions = difficultyOptions.filter(option => {
  const value = difficultyMap[option];
  return value >= 9 && value <= 48; // 2B to 8C
});

// Constants for slider range
const MIN_VALUE = 9; // 2B
const MAX_VALUE = 48; // 8C

// Numeric values for the sliders
const minSliderValue = ref(difficultyMap[props.minDifficulty] || MIN_VALUE);
const maxSliderValue = ref(difficultyMap[props.maxDifficulty] || MAX_VALUE);

// Convert slider values to difficulties
const minDifficultyValue = computed(() => {
  return filterDifficultyOptions.find(d => difficultyMap[d] === minSliderValue.value) || '2B';
});

const maxDifficultyValue = computed(() => {
  return filterDifficultyOptions.find(d => difficultyMap[d] === maxSliderValue.value) || '8C';
});


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

// Compute styles for the range slider track (colored section)
const rangeTrackStyle = computed(() => {
  const min = minSliderValue.value;
  const max = maxSliderValue.value;
  const range = MAX_VALUE - MIN_VALUE;
  const left = ((min - MIN_VALUE) / range) * 100;
  const width = ((max - min) / range) * 100;
  
  return {
    left: `${left}%`,
    width: `${width}%`,
    background: min === max 
      ? getDifficultyColor(min)
      : `linear-gradient(to right, 
          ${getDifficultyColor(min)}, 
          ${getDifficultyColor(Math.floor((min + max) / 2))}, 
          ${getDifficultyColor(max)})`
  };
});

// Track which slider should be active based on proximity to click
const activeSlider = ref<'min' | 'max' | null>(null);

// Handle slider input events with proper constraint logic
const handleMinInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const newValue = parseInt(target.value);
  const currentMax = maxSliderValue.value;
  
  if (newValue <= currentMax) {
    // Normal case: min slider stays within bounds
    minSliderValue.value = newValue;
  } else {
    // Min slider would pass max - push max along
    minSliderValue.value = newValue;
    maxSliderValue.value = newValue;
  }
};

const handleMaxInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const newValue = parseInt(target.value);
  const currentMin = minSliderValue.value;
  
  if (newValue >= currentMin) {
    // Normal case: max slider stays within bounds
    maxSliderValue.value = newValue;
  } else {
    // Max slider would pass min - push min along
    maxSliderValue.value = newValue;
    minSliderValue.value = newValue;
  }
};

// Enhanced z-index logic for better interaction
const minSliderZIndex = computed(() => {
  const minPos = ((minSliderValue.value - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100;
  const maxPos = ((maxSliderValue.value - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100;
  
  // If handles are very close, use active slider or default behavior
  if (Math.abs(maxPos - minPos) < 5) {
    return activeSlider.value === 'min' ? 3 : 1;
  }
  
  // Normal case - min slider has lower z-index
  return 1;
});

const maxSliderZIndex = computed(() => {
  const minPos = ((minSliderValue.value - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100;
  const maxPos = ((maxSliderValue.value - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100;
  
  // If handles are very close, use active slider or default behavior  
  if (Math.abs(maxPos - minPos) < 5) {
    return activeSlider.value === 'max' ? 3 : 2;
  }
  
  // Normal case - max slider has higher z-index
  return 2;
});

// Handle focus events to determine which slider should be active
const handleMinFocus = () => {
  activeSlider.value = 'min';
};

const handleMaxFocus = () => {
  activeSlider.value = 'max';
};

const handleBlur = () => {
  activeSlider.value = null;
};

onMounted(() => {
  // Normalize initial values
  if (props.minDifficulty) {
    minSliderValue.value = difficultyMap[props.minDifficulty] || MIN_VALUE;
  }
  if (props.maxDifficulty) {
    maxSliderValue.value = difficultyMap[props.maxDifficulty] || MAX_VALUE;
  }
});
</script>

<template>
  <div class="difficulty-filter-container">
    <div v-if="isFilterVisible" class="difficulty-filter">
      <!-- Range display -->

      
      <!-- Dual slider container -->
      <div class="dual-slider-container">
        <!-- Track background -->
        <div class="slider-track">
          <div class="slider-range" :style="rangeTrackStyle"></div>
        </div>
        
        <!-- Min slider -->
        <input
          type="range"
          :min="MIN_VALUE"
          :max="MAX_VALUE"
          :value="minSliderValue"
          @input="handleMinInput"
          @focus="handleMinFocus"
          @blur="handleBlur"
          @mousedown="handleMinFocus"
          @touchstart="handleMinFocus"
          class="slider slider-min"
          :style="{ zIndex: minSliderZIndex }"
        />
        
        <!-- Max slider -->
        <input
          type="range"
          :min="MIN_VALUE"
          :max="MAX_VALUE"
          :value="maxSliderValue"
          @input="handleMaxInput"
          @focus="handleMaxFocus"
          @blur="handleBlur"
          @mousedown="handleMaxFocus"
          @touchstart="handleMaxFocus"
          class="slider slider-max"
          :style="{ zIndex: maxSliderZIndex }"
        />
        
        <!-- Handle labels using DifficultyLabel component -->
        <div 
          v-if="minSliderValue !== maxSliderValue"
          class="slider-handle slider-handle-min"
          :style="{ 
            left: `${((minSliderValue - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100}%`
          }"
        >
          <DifficultyLabel :difficulty="minDifficultyValue" />
        </div>
        
        <div 
          v-if="minSliderValue !== maxSliderValue"
          class="slider-handle slider-handle-max"
          :style="{ 
            left: `${((maxSliderValue - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100}%`
          }"
        >
          <DifficultyLabel :difficulty="maxDifficultyValue" />
        </div>
        
        <!-- Single handle when both values are equal -->
        <div 
          v-if="minSliderValue === maxSliderValue"
          class="slider-handle slider-handle-single"
          :style="{ 
            left: `${((minSliderValue - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100}%`
          }"
        >
          <DifficultyLabel :difficulty="minDifficultyValue" />
        </div>
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
}

.difficulty-filter {
  background-color: rgba(50, 50, 50, 0.8);
  border-radius: 8px 8px 0 0;
  padding: 20px 15px;
  width: 100%;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.2);
}


.dual-slider-container {
  position: relative;
  width: 100%;
  height: 60px;
}

.slider-track {
  position: absolute;
  top: 25px;
  left: 0;
  right: 0;
  height: 6px;
  background-color: #ddd;
  border-radius: 3px;
}

.slider-range {
  position: absolute;
  height: 100%;
  border-radius: 3px;
  transition: all 0.1s ease;
}

.slider {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  width: 100%;
  height: 16px;
  background: transparent;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  pointer-events: none;
}


/* Webkit slider thumb */
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #666;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.1s ease;
  pointer-events: auto;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  border-color: #333;
}

.slider::-webkit-slider-thumb:active {
  transform: scale(1.2);
  border-color: #000;
}

/* Firefox slider thumb */
.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #666;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.1s ease;
  pointer-events: auto;
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.1);
  border-color: #333;
}

.slider::-moz-range-thumb:active {
  transform: scale(1.2);
  border-color: #000;
}

/* Firefox track */
.slider::-moz-range-track {
  background: transparent;
  border: none;
}

.slider-handle {
  position: absolute;
  top: -12px;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 10;
  transition: all 0.1s ease;
}

.slider-handle-min {
  z-index: 11;
}

.slider-handle-max {
  z-index: 12;
}

.slider-handle-single {
  z-index: 13;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .difficulty-filter {
    padding: 15px 10px;
  }
  
  .dual-slider-container {
    height: 70px;
  }
  
  .slider::-webkit-slider-thumb {
    width: 24px;
    height: 24px;
    pointer-events: auto;
  }
  
  .slider::-moz-range-thumb {
    width: 24px;
    height: 24px;
    pointer-events: auto;
  }
  
  .slider-track {
    height: 8px;
    top: 28px;
  }
  
  .slider {
    top: 22px;
    height: 20px;
  }
  
}

@media (max-width: 480px) {
  .dual-slider-container {
    height: 80px;
  }
  
  .slider::-webkit-slider-thumb {
    width: 28px;
    height: 28px;
    pointer-events: auto;
  }
  
  .slider::-moz-range-thumb {
    width: 28px;
    height: 28px;
    pointer-events: auto;
  }
  
  .slider-track {
    height: 10px;
    top: 32px;
  }
  
  .slider {
    top: 24px;
    height: 24px;
  }
  
  .slider-handle {
    top: -10px;
  }
  
  .difficulty-filter {
    border-radius: 0;
  }
  
}

/* Improve touch targets on mobile */
@media (hover: none) and (pointer: coarse) {
  .slider::-webkit-slider-thumb {
    width: 32px;
    height: 32px;
    pointer-events: auto;
  }
  
  .slider::-moz-range-thumb {
    width: 32px;
    height: 32px;
    pointer-events: auto;
  }
}
</style>
