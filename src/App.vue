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
      panZoomInstance.pan(centerX + 100, centerY, { animate: true });
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
      maxScale: 5,
      minScale: 0.5,
      step: 0.3,
      startScale: 1.5
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
</script>

<template>
  <!-- Begin wrapping all content in a container that uses vertical stacking -->
  <div class="app-container">
    <div class="carousel-container" :style="{ backgroundColor: selectedAreaBackground }">
      <button class="carousel-btn" @click="prevArea">&#8592;</button>
      <span class="carousel-text"> <h3>{{ areaNames[selectedAreaIndex] }}</h3></span>
      <button class="carousel-btn" @click="nextArea">&#8594;</button>
    </div>
    
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
            @select-area="selectArea" 
            @hover="hoveredArea = $event"
            @select-crag="handleSelectCrag"
          />

          <!-- Debug point -->
          <circle 
            v-if="debugCenter" 
            :cx="debugCenter.x" 
            :cy="debugCenter.y" 
            r="10" 
            fill="red" 
            stroke="black" 
            stroke-width="2"
          />
        </svg>
      </div>
      
      <div v-if="showTooltip && selectedCrag" class="fixed-tooltip">
        <RouteTooltip
          :selected-crag="selectedCrag"
          :crag-routes="cragRoutes"
          @close="hideTooltip"
        />
      </div>
    </div>
  </div>
  <!-- End app-container -->
</template>

<style scoped>
.map-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: manipulation;
  
  /* border: 1px solid rgb(75, 75, 75); */
}

.map-wrapper svg {
  width: 1265px;
  height: 781px;
  display: block;
  
}

.absolute {
  position: absolute;  
}
.cursor-pointer {
  cursor: pointer;
}
/* #map {
  width: 100vw;
  height: 100vh;
} */
.map-header {
  margin-top: 60px;
  margin-bottom: 12px;
  text-align: center;
}
.map-header h1 {
  font-size: 2rem;
  font-weight: 600;
  color: #222;
  margin: 0;
}
.tooltip-container {
  transform: translate(1000px, 100px);
}
.fixed-tooltip {
  position: fixed;
  bottom: 40px;
  width: 100%;
  padding: 10px;
  max-width: 500px;
  z-index: 1000;
}

.carousel-container {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 5px;
  color: #060404;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); /* Added shadow */
}
.carousel-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  color: inherit;
  cursor: pointer;
  padding: 0 15px;
}
.carousel-text {
  font-size: 1.2rem;
  font-weight: bold;
  /* text-shadow: 0 1px 2px rgba(0,0,0,0.4); */
}

.app-container {
  display: flex;
  flex-direction: column;
  width: 100%;
}
</style>

<style>
body {
  background-color: rgba(197, 193, 193, 0.068);
  margin: 0;
  padding: 0;
}
</style>