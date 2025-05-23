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

// State for filter visibility - start compact to save space
const isFilterVisible = ref(false);

// State for select dropdowns
const showMinSelect = ref(false);
const showMaxSelect = ref(false);

// Toggle filter visibility
const toggleFilterVisibility = () => {
  isFilterVisible.value = !isFilterVisible.value;
};

// Handle difficulty label clicks
const handleMinLabelClick = () => {
  showMinSelect.value = !showMinSelect.value;
  showMaxSelect.value = false; // Close other select
};

const handleMaxLabelClick = () => {
  showMaxSelect.value = !showMaxSelect.value;
  showMinSelect.value = false; // Close other select
};

// Get compact grade options (main numbers only: 2, 3, 4, 5, 6, 7, 8)
const getCompactGradeOptions = () => {
  const mainGrades = [];
  for (let grade = 2; grade <= 8; grade++) {
    const baseGrade = `${grade}A`; // Use base grade (e.g., 2A, 3A, etc.)
    if (difficultyMap[baseGrade]) {
      mainGrades.push({
        display: grade.toString(),
        value: baseGrade,
        numericValue: difficultyMap[baseGrade]
      });
    }
  }
  return mainGrades;
};

// Get valid options for min difficulty (only main grades <= current max)
const validMinOptions = computed(() => {
  const compactOptions = getCompactGradeOptions();
  return compactOptions.filter(option => 
    option.numericValue <= maxSliderValue.value
  );
});

// Get valid options for max difficulty (only main grades >= current min)
const validMaxOptions = computed(() => {
  const compactOptions = getCompactGradeOptions();
  return compactOptions.filter(option => 
    option.numericValue >= minSliderValue.value
  );
});

// Handle select option clicks
const selectMinDifficulty = (gradeOption: { display: string; value: string; numericValue: number }) => {
  minSliderValue.value = gradeOption.numericValue;
  showMinSelect.value = false;
};

const selectMaxDifficulty = (gradeOption: { display: string; value: string; numericValue: number }) => {
  maxSliderValue.value = gradeOption.numericValue;
  showMaxSelect.value = false;
};

// Close selects when clicking outside
const closeSelects = () => {
  showMinSelect.value = false;
  showMaxSelect.value = false;
};

// Display range text for compact view
const rangeDisplayText = computed(() => {
  if (minSliderValue.value === maxSliderValue.value) {
    return minDifficultyValue.value;
  }
  return `${minDifficultyValue.value}–${maxDifficultyValue.value}`;
});

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
    <!-- Compact view when filter is hidden -->
    <div v-if="!isFilterVisible" class="difficulty-filter-compact" @click="toggleFilterVisibility">
      <div class="compact-display">
        <div class="compact-left">
          <span class="compact-label">Difficulty:</span>
          <span 
            class="compact-value"
            :style="{ 
              backgroundColor: minSliderValue === maxSliderValue 
                ? getDifficultyColor(minSliderValue) 
                : `linear-gradient(to right, ${getDifficultyColor(minSliderValue)}, ${getDifficultyColor(maxSliderValue)})`,
              color: '#fff'
            }"
          >
            {{ rangeDisplayText }}
          </span>
        </div>
        <span class="expand-icon">▲</span>
      </div>
    </div>

    <!-- Full slider view when filter is visible -->
    <div v-if="isFilterVisible" class="difficulty-filter" @click="closeSelects">
      <!-- Horizontal layout with slider and collapse button -->
      <div class="filter-content-row">
        <div class="slider-row">
          <!-- Min difficulty label on the left -->
          <div class="difficulty-label-container" @click.stop="handleMinLabelClick">
            <DifficultyLabel :difficulty="minDifficultyValue" />
            
            <!-- Min difficulty select dropdown -->
            <div v-if="showMinSelect" class="difficulty-select-dropdown">
              <div 
                v-for="option in validMinOptions" 
                :key="option.value"
                class="difficulty-option difficulty-number-option"
                @click="selectMinDifficulty(option)"
              >
                {{ option.display }}
              </div>
            </div>
          </div>
          
          <!-- Dual slider container in the middle -->
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
          </div>
          
          <!-- Max difficulty label on the right -->
          <div class="difficulty-label-container" @click.stop="handleMaxLabelClick">
            <DifficultyLabel :difficulty="maxDifficultyValue" />
            
            <!-- Max difficulty select dropdown -->
            <div v-if="showMaxSelect" class="difficulty-select-dropdown difficulty-select-dropdown-right">
              <div 
                v-for="option in validMaxOptions" 
                :key="option.value"
                class="difficulty-option difficulty-number-option"
                @click="selectMaxDifficulty(option)"
              >
                {{ option.display }}
              </div>
            </div>
          </div>
          
          <!-- Collapse button on the right -->
          <button 
            @click.stop="toggleFilterVisibility"
            class="collapse-button"
            aria-label="Hide difficulty filter"
          >
            ▼
          </button>
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
  padding: 12px 15px;
  width: 100%;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.2);
}

.filter-content-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.difficulty-filter-compact {
  background-color: rgba(50, 50, 50, 0.8);
  border-radius: 8px 8px 0 0;
  padding: 8px 15px;
  width: 100%;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.difficulty-filter-compact:hover {
  background-color: rgba(60, 55, 55, 0.8);
}

.compact-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
  width: 100%;
}

.compact-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0; /* Allow shrinking */
}

.compact-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  flex-shrink: 0; /* Don't shrink the label */
}

.compact-value {
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.expand-icon {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  flex-shrink: 0; /* Don't shrink the icon */
  margin-left: 8px;
}

.collapse-button {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.6);
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 10px;
  transition: background-color 0.2s ease;
  flex-shrink: 0; /* Don't shrink the button */
}

.collapse-button:hover {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1; /* Take available space */
}

.difficulty-label-container {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  position: relative;
  cursor: pointer;
}

.difficulty-label-container:hover {
  opacity: 0.8;
}

.difficulty-select-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  background: rgba(40, 40, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 100;
  margin-bottom: 30px; /* Increased margin to avoid collapse button */
  min-width: 40px;
  display: flex;
  flex-direction: column;
}

.difficulty-select-dropdown-right {
  left: auto;
  right: 0;
}

.difficulty-option {
  padding: 4px 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.difficulty-option:hover {
  background: rgba(255, 255, 255, 0.1);
}

.difficulty-number-option {
  text-align: center;
  font-weight: bold;
  font-size: 16px;
  color: white;
  min-width: 24px;
  padding: 8px 12px;
}

.dual-slider-container {
  position: relative;
  flex: 1;
  height: 40px; /* Reduced from 60px */
}

.slider-track {
  position: absolute;
  top: 17px; /* Adjusted for smaller container */
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
  top: 12px; /* Adjusted for smaller container */
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
  border: 2px solid #333;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
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
  border: 2px solid #333;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
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


/* Mobile optimizations */
@media (max-width: 768px) {
  .difficulty-filter {
    padding: 10px 12px;
  }
  
  .difficulty-filter-compact {
    padding: 6px 12px;
  }
  
  .dual-slider-container {
    height: 45px; /* Slightly larger for mobile touch targets */
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
    top: 20px;
  }
  
  .slider {
    top: 14px;
    height: 20px;
  }
  
  .compact-display {
    font-size: 16px; /* Larger text on mobile */
  }
  
  .compact-value {
    font-size: 16px;
    padding: 6px 14px;
  }
  
  .slider-row {
    gap: 8px; /* Reduce gap on mobile */
  }
  
  .difficulty-select-dropdown {
    min-width: 50px;
  }
  
  .difficulty-option {
    padding: 6px 10px; /* Larger touch targets */
  }
  
  .difficulty-number-option {
    padding: 10px 14px;
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .dual-slider-container {
    height: 50px; /* Larger touch targets for small screens */
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
    top: 22px;
  }
  
  .slider {
    top: 16px;
    height: 24px;
  }
  
  .difficulty-filter {
    border-radius: 0;
  }
  
  .difficulty-filter-compact {
    border-radius: 0;
  }
  
  .slider-row {
    gap: 6px; /* Even smaller gap on very small screens */
  }
  
  .difficulty-select-dropdown {
    font-size: 14px;
  }
  
  .difficulty-option {
    padding: 8px 12px; /* Even larger touch targets for small screens */
  }
  
  .difficulty-number-option {
    padding: 12px 16px;
    font-size: 20px;
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
