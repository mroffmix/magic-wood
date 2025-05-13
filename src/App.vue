<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Panzoom from '@panzoom/panzoom';
import { applyShiftPath, getPathCenter } from './utils/shiftPath';
import { areas } from './map-data/areas'; 
import { tracks } from './map-data/tracks';
import { semTrack } from './map-data/sem-track';
import { crags } from './map-data/crags';
import { e_crags } from './map-data/e-crags'; 
import AreasLayer from './components/layers/AreasLayer.vue';
import TracksLayer from './components/layers/TracksLayer.vue';
import CragsLayer from './components/layers/CragsLayer.vue';
import RouteTooltip from '@/components/common/RouteTooltip.vue';
import DifficultyFilter from '@/components/filters/DifficultyFilter.vue';
import AreaCarousel from '@/components/common/AreaCarousel.vue';
import routesData from '@/routes-data/filled_routes.json';
import type { SvgObject } from '@/types/SvgObject';

applyShiftPath(areas);
applyShiftPath(tracks);
applyShiftPath(crags);
applyShiftPath(e_crags);
applyShiftPath(semTrack);

const selectedArea = ref<string | undefined>(undefined);
const hoveredArea = ref<string | null>(null);

const showTooltip = ref(false);
const selectedCrag = ref<SvgObject | null>(null);

const getRoutesByCrag = (cragName: string, cragSector: string) => {
  return routesData
    .filter(route => route.area === cragSector)
    .filter(route => route.blockNumber === cragName)
    .filter(route => route.difficulty && route.difficulty.trim() !== '');
};

const cragRoutes = computed(() => {
  if (!selectedCrag.value) return [];
  return getRoutesByCrag(selectedCrag.value.name, selectedCrag.value.sector || '');
});

const selectArea = (name: string) => {
  selectedArea.value = name;
};

const handleSelectCrag = (crag: SvgObject) => {
  selectArea(crag.name);
  selectedCrag.value = crag;
  showTooltip.value = true;
};

const hideTooltip = () => {
  showTooltip.value = false;
};

// New: Compute area names from areas (assumes each area has a 'name' property)
const areaNames = computed(() => areas.map((area: any) => area.name));

// New: Computed index of the currently selected area (default to 0 if not found)
const selectedAreaIndex = computed(() => {
  const index = areaNames.value.findIndex(name => name === selectedArea.value);
  return index >= 0 ? index : 0;
});

// Add debug reference for the center point
const debugCenter = ref<{x: number, y: number} | null>(null);

// Updated: Function to center and focus on a selected area accounting for shifted coordinates
const centerOnArea = (areaName: string) => {
  if (!panZoomInstance) return;
  
  const area = areas.find((a: any) => a.name === areaName);
  if (!area) return;
  
  // Get the area's coordinates, which are already shifted by applyShiftPath
  const center = {
    // Calculate actual center by adding half the width and height to the x,y coordinates
    x: area.x + (area.width / 2),
    y: area.y + (area.height / 2)
  };
  
  // Set debug point coordinates for visualization
  debugCenter.value = { x: center.x, y: center.y };
  
  // Get the SVG element dimensions
  if (mapSvg.value) {
    const parent = mapSvg.value.parentElement;
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      
      // Fix calculation: need to center the area in the viewport
      // Calculate how much to pan to get the area in the center
      const centerX = -center.x + (parentRect.width / 4);
      const centerY = -center.y + (parentRect.height / 4);
      
      // Pan to center with animation
      // panZoomInstance.pan(centerX + 100, centerY, { animate: true });
      panZoomInstance.zoom(1, { animate: true });
    }
  }
};

// Updated: Handler functions for carousel navigation with type safety
const nextArea = () => {
  const currentIndex = selectedAreaIndex.value;
  const newIndex = (currentIndex + 1) % areaNames.value.length;
  selectedArea.value = areaNames.value[newIndex];
  // Use optional chaining or provide default value to handle undefined
  if (selectedArea.value) {
    centerOnArea(selectedArea.value);
  }
};

const prevArea = () => {
  const currentIndex = selectedAreaIndex.value;
  const newIndex = (currentIndex - 1 + areaNames.value.length) % areaNames.value.length;
  selectedArea.value = areaNames.value[newIndex];
  // Use optional chaining or provide default value to handle undefined
  if (selectedArea.value) {
    centerOnArea(selectedArea.value);
  }
};

// New: Compute selected area's background color (assumes each area may have a 'color' property)
const selectedAreaColor = computed(() => {
  const area = areas.find((a: any) => a.name === selectedArea.value);
  return area?.fill || '#eee';
});

// New: Computed property for transparent background color (50% opacity)
const selectedAreaBackground = computed(() => {
  let hex = selectedAreaColor.value;
  if (hex && hex.startsWith('#')) {
    if (hex.length === 4) {
      hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.5)`;
  }
  return hex;
});

// Pan-Zoom Integration
const mapSvg = ref<SVGSVGElement | null>(null);
let panZoomInstance: any = null;

onMounted(() => {
  if (mapSvg.value) {
    panZoomInstance = Panzoom(mapSvg.value, {
      maxScale: 20,
      minScale: 2.5,
      step: 5,
      startScale: 2.5
    });
    mapSvg.value.parentElement?.addEventListener('wheel', panZoomInstance.zoomWithWheel);

    // Center the panZoom instance using the parent's dimensions.
    const parent = mapSvg.value.parentElement;
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      const svgRect = mapSvg.value.getBoundingClientRect();
      // Calculate offset so that the SVG is centered in the parent.
      const offsetX = (parentRect.width - svgRect.width) / 2;
      const offsetY = (parentRect.height - svgRect.height) / 2;
      panZoomInstance.pan(offsetX, offsetY);
    }
  }
});

onBeforeUnmount(() => {
  if (panZoomInstance) {
    mapSvg.value?.parentElement?.removeEventListener('wheel', panZoomInstance.zoomWithWheel);
    panZoomInstance.destroy();
  }
});

// Add difficulty filter state
const minDifficulty = ref('2B');
const maxDifficulty = ref('8C');
</script>

<template>
  <!-- Begin wrapping all content in a container that uses vertical stacking -->
  <div class="app-container">
    <AreaCarousel 
      :area-names="areaNames" 
      :selected-index="selectedAreaIndex" 
      @next="nextArea" 
      @prev="prevArea"
    />
    
    <div id="map">
      <div class="map-wrapper" >
        <svg 
          ref="mapSvg"
          viewBox="0 0 1265 781"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="cragGradient" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
              <stop offset="0%" stop-color="#888888" stop-opacity="1"/>
              <stop offset="100%" stop-color="#444444" stop-opacity="1"/>
            </radialGradient>
            <radialGradient id="lightCragGradient" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
              <stop offset="0%" stop-color="#e0e0e0" stop-opacity="1"/>
              <stop offset="100%" stop-color="#bbbbbb" stop-opacity="1"/>
            </radialGradient>
          </defs>
          
          <!-- Map Layers -->
          <AreasLayer 
            :areas="areas" 
            :selectedArea="selectedArea" 
            @select-area="selectArea" 
            @hover="hoveredArea = $event"
          />
        
          <TracksLayer 
            :tracks="tracks" 
            :semTracks="semTrack" 
          />
        
          <CragsLayer 
            :crags="crags" 
            :eCrags="e_crags" 
            :getPathCenter="getPathCenter"
            :minDifficulty="minDifficulty"
            :maxDifficulty="maxDifficulty"
            :routes="routesData"
            @select-area="selectArea" 
            @hover="hoveredArea = $event"
            @select-crag="handleSelectCrag"
          />

          <!-- Debug point -->
          
          <circle 
            v-if="debugCenter" 
            :cx="debugCenter.x" 
            :cy="debugCenter.y" 
            r="1" 
            fill="red" 
            stroke-width="2"
          />
           
        </svg>
      </div>
      
     
    </div>
    
    <!-- Difficulty filter positioned at bottom -->
    <div class="bottom-filter-container">
      <DifficultyFilter
        v-model:minDifficulty="minDifficulty"
        v-model:maxDifficulty="maxDifficulty"
      />
    </div>

    <div v-if="showTooltip && selectedCrag" class="fixed-tooltip">
        <RouteTooltip
          :selected-crag="selectedCrag"
          :crag-routes="cragRoutes"
          @close="hideTooltip"
        />
      </div>
  </div>
  <!-- End app-container -->
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  width: 100vw; /* Use viewport width unit */
  height: 100vh;
  position: relative;
  overflow: hidden;
}

/* Map takes all available space between fixed elements */
#map {
  flex: 1;
  width: 100vw; /* Full viewport width */
  display: flex;
  flex-direction: column;
  position: absolute; /* Use absolute positioning */
  top: 45px; /* Top position after the carousel */
  bottom: 40px; /* Bottom position before the filter */
  left: 0;
  right: 0;
  overflow: hidden;
}

.map-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: manipulation;
}

.map-wrapper svg {
  width: 100%; /* Allow SVG to scale with the container */
  height: 100%;
  max-width: none; /* Remove any max-width constraints */
  min-width: 0; /* Remove min-width constraint */
  object-fit: cover; /* Cover available space */
}

/* Position AreaCarousel at the top of the page */
:deep(.carousel-container) {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  width: 100vw; /* Full viewport width */
}

/* Position DifficultyFilter at the bottom of the page */
.bottom-filter-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  z-index: 100; /* Higher z-index than the tooltip */
  pointer-events: none;
  width: 100vw; /* Full viewport width */
}

.bottom-filter-container > * {
  pointer-events: auto;
  width: 100%;
}

.fixed-tooltip {
  position: fixed;
  bottom: 120px; /* Increased from 100px to give more space */
  left: 50%;
  transform: translateX(-50%);
  width: 95%; /* Slightly wider */
  max-width: 450px; /* Increased from 400px */
  z-index: 90;
  margin-bottom: 20px;
}

/* Desktop-specific adjustments for the tooltip */
@media (min-width: 768px) {
  .fixed-tooltip {
    max-width: 550px; /* Larger tooltip on desktop */
    bottom: 140px; /* Position it higher on desktop */
  }
}
</style>

<style>
body {
  background-color: rgba(197, 193, 193, 0.068);
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

html {
  height: 100%;
}
</style>