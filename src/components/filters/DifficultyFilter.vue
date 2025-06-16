<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { difficultyMap, difficultyOptions, getDifficultyColor } from '@/utils/difficulty';
import DifficultyLabel from '@/components/common/DifficultyLabel.vue';


const props = defineProps({
  minDifficulty: {
    type: String,
    default: '5C'
  },
  maxDifficulty: {
    type: String,
    default: '8C+'
  }
});

const emit = defineEmits(['update:minDifficulty', 'update:maxDifficulty', 'filterVisibilityChange']);

// State for filter visibility - start compact to save space
const isFilterVisible = ref(false);

// State for select dropdowns
const showMinSelect = ref(false);
const showMaxSelect = ref(false);

// PWA standalone mode detection
const isPWAStandalone = ref(false);

// Check if app is running in standalone mode (PWA/fullscreen)
const checkPWAStandalone = () => {
  isPWAStandalone.value =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
};

// Toggle filter visibility
const toggleFilterVisibility = () => {
  isFilterVisible.value = !isFilterVisible.value;
  emit('filterVisibilityChange', isFilterVisible.value);
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

// Get compact grade options (main numbers only: 5, 6, 7, 8)
// 5 represents "≤5C" so we use numeric value of 5C as the base
const getCompactGradeOptions = () => {
  const mainGrades = [] as Array<{ display: string; value: string; numericValue: number }>;

  for (let grade = 5; grade <= 8; grade++) {
    const baseGrade = grade === 5 ? '5C' : `${grade}A`;

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
  // Clamp to MIN_VALUE to avoid going outside slider range
  minSliderValue.value = Math.max(gradeOption.numericValue, MIN_VALUE);
  showMinSelect.value = false;
};

const selectMaxDifficulty = (gradeOption: { display: string; value: string; numericValue: number }) => {
  // Clamp to MAX_VALUE for safety
  maxSliderValue.value = Math.min(gradeOption.numericValue, MAX_VALUE);
  showMaxSelect.value = false;
};

// Close selects when clicking outside
const closeSelects = () => {
  showMinSelect.value = false;
  showMaxSelect.value = false;
};

const formatDisplay = (diff: string) => (diff === '5C' ? '≤5C' : diff);
const displayMinDifficulty = computed(() => formatDisplay(minDifficultyValue.value));
const displayMaxDifficulty = computed(() => formatDisplay(maxDifficultyValue.value));

// Display range text for compact view
const rangeDisplayText = computed(() => {
  if (minSliderValue.value === maxSliderValue.value) {
    return displayMinDifficulty.value;
  }
  return `${displayMinDifficulty.value}–${displayMaxDifficulty.value}`;
});

// Filter difficulty options to only show the range needed for the filter
// Start from 5C and include grades up to 8C+
const filterDifficultyOptions = difficultyOptions.filter(option => {
  const value = difficultyMap[option];
  return value >= difficultyMap['5C'] && value <= difficultyMap['8C+'];
});

// Constants for slider range (5C and less up to 8C+)
const MIN_VALUE = difficultyMap['5C'];
const MAX_VALUE = difficultyMap['8C+'];

// Numeric values for the sliders
const minSliderValue = ref(
  Math.max(difficultyMap[props.minDifficulty] || MIN_VALUE, MIN_VALUE)
);
const maxSliderValue = ref(
  Math.min(difficultyMap[props.maxDifficulty] || MAX_VALUE, MAX_VALUE)
);

// Convert slider values to difficulties
const minDifficultyValue = computed(() => {
  return (
    filterDifficultyOptions.find(d => difficultyMap[d] === minSliderValue.value) ||
    '5C'
  );
});

const maxDifficultyValue = computed(() => {
  return (
    filterDifficultyOptions.find(d => difficultyMap[d] === maxSliderValue.value) ||
    '8C+'
  );
});


// Watch for changes and emit events
watch(minSliderValue, (newValue) => {
  if (newValue > maxSliderValue.value) {
    maxSliderValue.value = newValue;
  }
  const emitValue =
    newValue === MIN_VALUE ? '1A' : minDifficultyValue.value;
  emit('update:minDifficulty', emitValue);
});

watch(maxSliderValue, (newValue) => {
  if (newValue < minSliderValue.value) {
    minSliderValue.value = newValue;
  }
  emit('update:maxDifficulty', maxDifficultyValue.value);
});

// Compute styles for the range slider track (colored section)
const rangeTrackStyle = computed(() => {
  // Clamp values to ensure they're within the valid range
  const min = Math.max(MIN_VALUE, Math.min(MAX_VALUE, minSliderValue.value));
  const max = Math.max(MIN_VALUE, Math.min(MAX_VALUE, maxSliderValue.value));
  const range = MAX_VALUE - MIN_VALUE;
  const left = Math.max(0, ((min - MIN_VALUE) / range) * 100);
  const width = Math.max(0, Math.min(100, ((max - min) / range) * 100));
  
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
  // Check PWA standalone status
  checkPWAStandalone();
  
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
    <!-- Collapse/Expand icon above the panel -->
    <div v-if="isFilterVisible" class="toggle-icon-container" @click.stop="toggleFilterVisibility">
      <font-awesome-icon v-if="isFilterVisible" :icon="['fas', 'chevron-down']" class="toggle-icon" />
      <!-- <font-awesome-icon v-else :icon="['fas', 'chevron-up']" class="toggle-icon" /> -->
    </div>

    <!-- Compact view when filter is hidden -->
    <div v-if="!isFilterVisible" class="difficulty-filter-compact" :class="{ 'pwa-standalone': isPWAStandalone }">
      <div class="compact-display" @click="toggleFilterVisibility">
        <div class="compact-center">
          <!-- <span class="compact-label">Difficulty:</span> -->
          <span 
            class="compact-value"
            :style="{ 
              background: minSliderValue === maxSliderValue 
                ? getDifficultyColor(minSliderValue) 
                : `linear-gradient(to right, ${getDifficultyColor(minSliderValue)}, ${getDifficultyColor(maxSliderValue)})`,
              color: '#fff'
            }"
          >
            {{ rangeDisplayText }}
          </span>
        </div>
      </div>
    </div>

    <!-- Full slider view when filter is visible -->
    <div v-if="isFilterVisible" class="difficulty-filter" :class="{ 'pwa-standalone': isPWAStandalone }">
      <div class="filter-content" @click="closeSelects">
        <!-- Horizontal layout with slider -->
        <div class="filter-content-row">
        <div class="slider-row">
          <!-- Min difficulty label on the left -->
          <div class="difficulty-label-container" @click.stop="handleMinLabelClick">
            <DifficultyLabel
              :difficulty="minDifficultyValue"
              :displayText="displayMinDifficulty"
            />
            
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
            <DifficultyLabel
              :difficulty="maxDifficultyValue"
              :displayText="displayMaxDifficulty"
            />
            
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
          
        </div>
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
  width: 100%;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.2);
  position: relative;
}

.filter-content {
  padding: 12px 15px 12px 15px;
}

.filter-content-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.difficulty-filter-compact {
  background-color: transparent;
  border-radius: 8px 8px 0 0;
  width: 100%;
  position: relative;
  /* transition: background-color 0.2s ease; */
}

.compact-display {
  padding: 4px 5px 4px 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
  width: 100%;
  position: relative;
  background-color: transparent;
}

/* .difficulty-filter-compact:hover {
  background-color: rgba(60, 55, 55, 0.8);
} */

.compact-center {
  display: flex;
  align-items: center;
  justify-content: center;
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
  padding: 2px;
  border-radius: 12px; 
  font-weight: bold;
  font-size: 12px;
  /* box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); */
}

.toggle-icon-container {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(50, 50, 50, 0.8);
  border-radius: 12px 12px 0 0;
  padding: 4px 22px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  z-index: 10;
}

/* .toggle-icon-container:hover {
  background:  rgba(0, 0, 0, 0.975);
} */

.toggle-icon {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: bold;
  display: block;
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
  margin: 0 10px; /* Add margin to prevent thumb from covering labels */
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
    padding: 0px 2px;
  }

  /* Only apply min-height when in PWA standalone mode (fullscreen) */
  .difficulty-filter.pwa-standalone {
    min-height: 100px;
  }
  
  .difficulty-filter-compact.pwa-standalone {
    min-height: 100px;
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
