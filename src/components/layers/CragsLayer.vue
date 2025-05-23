<script setup lang="ts">
import type { SvgObject } from '@/types/SvgObject';
import { computed } from 'vue';
import { getDifficultyValue } from '@/utils/difficulty';

// Add the new difficulty filter props
const props = defineProps({
  crags: {
    type: Array as () => SvgObject[],
    required: true
  },
  eCrags: {
    type: Array as () => SvgObject[],
    required: true
  },
  getPathCenter: {
    type: Function,
    required: true
  },
  // New props for difficulty filtering
  minDifficulty: {
    type: String,
    default: '7A'
  },
  maxDifficulty: {
    type: String,
    default: '9C'
  },
  // Add routes data as a new prop
  routes: {
    type: Array as () => Array<{
      blockNumber: string;
      area: string;
      difficulty: string;
      name: string;
      starscount: number;
    }>,
    default: () => []
  },
  // New prop to check if a crag is selected
  isCragSelected: {
    type: Function,
    required: true
  },
  // New prop to show crags with starred routes
  showStarredCrags: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['select-area', 'hover', 'select-crag']);

const selectArea = (crag: SvgObject) => {
  console.log('selectArea called for crag:', crag.name, 'visible:', isCragVisible(crag));
  
  // Only allow selection of crags that have visible routes
  if (!isCragVisible(crag)) {
    console.log('Crag click ignored - no visible routes:', crag.name);
    return;
  }
  
  console.log('Crag clicked:', crag.name);
  emit('select-area', crag.sector);
  emit('select-crag', crag);
};

// const setHoveredArea = (name: string | null) => {
//   emit('hover', name);
// };

// Get numeric values for min and max difficulty
const minDifficultyValue = computed(() => getDifficultyValue(props.minDifficulty));
const maxDifficultyValue = computed(() => getDifficultyValue(props.maxDifficulty));

// Function to check if a crag should be visible based on routes difficulty
const isCragVisible = (crag: SvgObject) => {
  // If the crag doesn't have a name or sector, always show it
  if (!crag.name || !crag.sector) return true;
  
  // Find all routes that match this crag
  const cragRoutes = props.routes.filter(route => 
    route.blockNumber === crag.name && 
    route.area === crag.sector && 
    route.difficulty && 
    route.difficulty.trim() !== ''
  );
  
  // If no routes found, always show the crag
  if (cragRoutes.length === 0) return false;
  
  // Check if any route's difficulty falls within the filtered range
  return cragRoutes.some(route => {
    const routeDifficultyValue = getDifficultyValue(route.difficulty);
    
    // Route is visible if its difficulty is within the filter range
    return routeDifficultyValue >= minDifficultyValue.value && 
           routeDifficultyValue <= maxDifficultyValue.value;
  });
};

// Get crag opacity based on whether it matches the filter
const getCragOpacity = (crag: SvgObject) => {
  return isCragVisible(crag) ? 1 : 0.2; // Full opacity for matching crags, 20% for non-matching
};

const getCragTitleOpacity = (crag: SvgObject) => {
  return isCragVisible(crag) ? 1 : 0; 
};

// Function to get additional name based on routes data
const getAdditionalName = (crag: SvgObject) => {
  const matchingRoute = props.routes.find(route => 
    route.area === crag.sector &&
    route.blockNumber === crag.name &&
    route.starscount > 2
  );
  
  return matchingRoute ? matchingRoute.name : null;
};

// Function to check if a crag has starred routes AND is currently visible
const cragHasStarredRoutes = (crag: SvgObject) => {
  if (!props.showStarredCrags) return false;
  
  // Only show stars for crags that are currently visible (match difficulty filter)
  if (!isCragVisible(crag)) return false;
  
  // Check if the crag has starred routes that match the current difficulty filter
  return props.routes.some(route => {
    if (route.area !== crag.sector || route.blockNumber !== crag.name) {
      return false;
    }
    
    // Route must have stars
    if (route.starscount === 0) return false;
    
    // Route must be within the current difficulty range
    const routeDifficultyValue = getDifficultyValue(route.difficulty);
    return routeDifficultyValue >= minDifficultyValue.value && 
           routeDifficultyValue <= maxDifficultyValue.value;
  });
};

// Add a safe wrapper for getPathCenter to handle NaN values
const safeGetPathCenter = (crag: SvgObject) => {
  if (!crag || !crag.path) {
    console.warn(`Crag ${crag.name} does not have a valid path.`);
    return { x: 0, y: 0 };
  }
  
  try {
    // Calculate center from the path
    const center = props.getPathCenter(crag.path, crag.x, crag.y);
    
    // Check if x or y is NaN and provide fallback based on bounding box instead
    if (isNaN(center.x) || isNaN(center.y)) {
      // console.warn(`Center coordinates for crag ${crag.name} ${crag.sector} are NaN. Using bounding box center instead.`);
      
      // Use bounding box to calculate center as a fallback
      // This is more reliable for problematic paths
      const fallbackCenter = {
        x: crag.x + (crag.width / 2),
        y: crag.y + (crag.height / 2)
      };
      
      return fallbackCenter;
    }
    
    return center;
  } catch (e) {
    console.error(`Error calculating center for crag ${crag.name}:`, e);
    
    // Fallback to simple bounding box center if any error occurs
    return {
      x: crag.x + (crag.width / 2),
      y: crag.y + (crag.height / 2)
    };
  }
};

// Add function to determine if a crag is too small to contain its text
const isCragTooSmall = (crag: SvgObject) => {
  // Check if width or height is below threshold (7 units is a reasonable text size)
  
  const minDimensionForText = 7;
  return (crag.width < minDimensionForText || crag.height < minDimensionForText);
}
</script>

<template>
  <g class="crags-layer">
    <!-- Easy crags - use the original props.eCrags without filtering -->
    <path
      v-for="(crag, index) in eCrags"
      :key="`e-${index}`"
      :id="crag.name"
      :d="crag.absolutePath"
      fill="url(#lightCragGradient)"
      stroke="none"
      :opacity="1"
    />
    
    <!-- Regular crags - apply highlight if selected -->
    <path
      v-for="(crag, index) in crags"
      :key="index"
      :id="crag.name + '_' + (crag.sector || '')"
      :d="crag.absolutePath"
      :fill="isCragSelected(crag) ? 'url(#selectedCragGradient)' : 'url(#cragGradient)'"
      :opacity="getCragOpacity(crag)"
      stroke="#222"
      stroke-width="0.7"
      cursor="pointer"
      @click="() => selectArea(crag)"
    />
    
    <!-- Crag labels - also apply opacity and use safe center function -->
    <g v-for="(crag, index) in crags" :key="'label-' + index">
      <!-- Background circle only shown for small crags -->
      <circle
        v-if="isCragTooSmall(crag)"
        :cx="safeGetPathCenter(crag).x"
        :cy="safeGetPathCenter(crag).y - 1"
        @click="() => selectArea(crag)"
        r="4"
        fill="rgba(0, 0, 0, 0.3)"
        cursor="pointer"
        :opacity="getCragTitleOpacity(crag)"
      />
      
      <text
        :x="safeGetPathCenter(crag).x"
        :y="safeGetPathCenter(crag).y"
        @click="() => selectArea(crag)"
        text-anchor="middle"
        alignment-baseline="middle"
        font-size="6"
        fill="#fff"
        font-weight="bold"
        cursor="pointer"
        style="user-select: none;"
        :opacity="getCragOpacity(crag)"
      >
        <tspan
          :x="safeGetPathCenter(crag).x"
          :y="safeGetPathCenter(crag).y"
          font-size="3"
          :style="{ 
            whiteSpace: 'pre', 
          }"
        >{{ crag.name }}</tspan>
      </text>
    </g>
    
    <!-- Add background and additional name as separate elements if it exists -->
    <g v-for="(crag, index) in crags.filter(c => getAdditionalName(c))" :key="'add-name-' + index">
      <!-- Background rectangle for additional name - sized based on text length -->
      <rect
        :x="safeGetPathCenter(crag).x - (getAdditionalName(crag)?.length || 0)"
        :y="safeGetPathCenter(crag).y + 3"
        :width="(getAdditionalName(crag)?.length || 0) * 2"
        height="7"
        rx="2"
        fill="rgba(80, 80, 80, 0.8)"
        :opacity="getCragTitleOpacity(crag)"
        @click="() => selectArea(crag)"
      />
      <!-- Additional name text with click handler -->
      <text
        :x="safeGetPathCenter(crag).x"
        :y="safeGetPathCenter(crag).y + 7"
        text-anchor="middle"
        alignment-baseline="middle"
        font-size="3"
        fill="#fff"
        font-weight="normal"
        style="user-select: none;"
        :opacity="getCragTitleOpacity(crag)"
        @click="() => selectArea(crag)"
      >{{ getAdditionalName(crag) }}</text>
    </g>
    
    <!-- Star indicators for crags with starred routes -->
    <g v-for="(crag, index) in crags.filter(c => cragHasStarredRoutes(c))" :key="'star-' + index">
      <circle
        :cx="safeGetPathCenter(crag).x + 6"
        :cy="safeGetPathCenter(crag).y - 6"
        r="2"
        fill="rgba(255, 215, 0, 0.9)"
        stroke="rgba(255, 255, 255, 0.8)"
        stroke-width="0.5"
        @click="() => selectArea(crag)"
      />
      <text
        :x="safeGetPathCenter(crag).x + 6"
        :y="safeGetPathCenter(crag).y - 6"
        text-anchor="middle"
        alignment-baseline="middle"
        font-size="2"
        fill="#000"
        font-weight="bold"
        style="user-select: none; pointer-events: none;"
      >★</text>
    </g>
  </g>
</template>

<style scoped>
.tooltip {
  background-color: rgba(91, 86, 86, 0.969);
  color: white;
  padding: 6px;
  border-radius: 8px;
  font-size: 10px;

  width: 100%;
  height: 100%;
  max-height: 400px;
  box-sizing: border-box;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow-y: auto; /* Enable vertical scrolling */
  scrollbar-width: none; /* Hide scrollbar for Firefox */
  -ms-overflow-style: none; /* Hide scrollbar for IE and Edge */
}

/* Hide scrollbar for Chrome, Safari and Opera */
.tooltip::-webkit-scrollbar {
  display: none;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 5px;
}

.close-button {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

h3 {
  margin: 0;
  font-size: 10px;
  text-align: left;
}

.routes-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: visible; /* Allow content to be scrollable within the parent */
}

.route-item {
  display: grid;
  grid-template-columns: 2fr auto auto;
  align-items: center;
  gap: 4px;
  padding: 3px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.route-info {
  display: flex;
  flex-direction: column;
}

.route-name {
  font-weight: 300;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-area {
  font-size: 7px;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.difficulty-container {
  display: flex;
  justify-content: flex-end;
  min-width: 28px;
}

.route-stars {
  color: gold;
  margin-right: 4px;
  text-align: right;
  flex-shrink: 0;
}

.no-routes {
  font-style: italic;
  opacity: 0.7;
  text-align: center;
  margin-top: 20px;
}
</style>
