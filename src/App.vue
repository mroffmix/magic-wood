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
import DifficultyLabel from '@/components/common/DifficultyLabel.vue';
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
var panZoomScale = 2;

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
  focusOn(crag);
  ;(window as any).selectedCrag = crag;
  panZoomInstance?.zoom(panZoomScale, { animate: true });
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
const debugCenter = ref<{ x: number, y: number } | null>(null);
const viewBoxCenter = ref<{ x: number, y: number } | null>(null);
const targetCenter = ref<{x: number, y: number} | null>(null);

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
const mapContainer = ref<HTMLElement | null>(null);
let panZoomInstance: any = null;

onMounted(() => {
  if (mapSvg.value) {
    // Detect if the device is mobile or desktop
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    panZoomScale = isMobile ? 2 : 5; 
    // Different zoom settings for mobile and desktop
    const zoomConfig = isMobile ? 
      {
        maxScale: 20,
        minScale: 2.5,
        step: 5,
        startScale: 2.5
      } : 
      {
        maxScale: 8,    // Lower max zoom for desktop
        minScale: 1.0,     // Lower min zoom for desktop
        step: 0.7,       // More precise zoom step for desktop
        startScale: 1.0  // Less initial zoom for desktop
      };
    
    panZoomInstance = Panzoom(mapSvg.value, zoomConfig);
    
    // Add wheel event handling
    mapSvg.value.parentElement?.addEventListener('wheel', panZoomInstance.zoomWithWheel);

    // Center the panZoom instance using the parent's dimensions.
    const parent = mapSvg.value.parentElement;
    
   
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      const svgRect = mapSvg.value.getBoundingClientRect();
      // Calculate offset so that the SVG is centered in the parent.
      const offsetX = (parentRect.width - svgRect.width) / 2;
      const offsetY = (parentRect.height - svgRect.height) / 2;

       viewBoxCenter.value = {
        x: 1280,
        y: 800
       };
      
      // panZoomInstance.pan(offsetX, offsetY, { animate: true });


     
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

// Add search functionality
const searchQuery = ref('');
const isSearchActive = ref(false);

// Enhanced search results with more details
const searchResults = computed(() => {
  if (!searchQuery.value || searchQuery.value.trim().length < 2) return [];
  
  const query = searchQuery.value.toLowerCase().trim();
  return routesData
    .filter(route => 
      (route.name && route.name.toLowerCase().includes(query)) || 
      (route.blockNumber && route.blockNumber.toLowerCase().includes(query))
    )
    .map(route => ({
      ...route,
      // Format difficulty for display
      formattedDifficulty: route.difficulty ? route.difficulty.trim() : 'N/A'
    }))
    .slice(0, 10); // Limit results to prevent overwhelming the UI
});

// Handle search result selection
const selectSearchResult = (route: any) => {
  if (route.blockNumber) {
    // Find the corresponding crag
    const selectedCragObject = [...crags].find(c => 
      c.name === route.blockNumber && c.sector === route.area
    );
    
    if (selectedCragObject) {
      handleSelectCrag(selectedCragObject);
      searchQuery.value = ''; // Clear search after selection
      isSearchActive.value = false;
      
      // Center on the selected crag with improved positioning
      
    }
  }
};

// Close search dropdown when clicking outside
const searchContainer = ref<HTMLElement | null>(null);
const closeSearchDropdown = (event: MouseEvent) => {
  if (searchContainer.value && !searchContainer.value.contains(event.target as Node)) {
    isSearchActive.value = false;
  }
};

onMounted(() => {
  // Add event listener to close search dropdown when clicking outside
  document.addEventListener('click', closeSearchDropdown);
});

onBeforeUnmount(() => {
  // Remove event listener
  document.removeEventListener('click', closeSearchDropdown);
});

// Add quick navigation function
const quickNavigate = () => {

  // Get selectedCrag from global variable if not set
  let selectedCragObj = selectedCrag.value;
  if (!selectedCragObj && (window as any).selectedCrag) {
    selectedCragObj = (window as any).selectedCrag;
  }
  if (selectedCragObj) {
    focusOn(selectedCragObj);
    panZoomInstance?.zoom(panZoomScale, { animate: true });
  }
  

};


function focusOn(crag: SvgObject) {
  const svg = mapSvg.value!;
  const pz  = panZoomInstance;
  if (!svg || !pz) return;

  /* 1-2. элемент + масштаб */
  console.log('crag', crag.name + '_' + crag.sector);
  const el = svg.getElementById(crag.name + '_' + crag.sector) as SVGGraphicsElement | null;
  console.log('el', el);
  if (!el) return;
  const zoomTo = 1;
  if (zoomTo !== undefined) pz.zoom(zoomTo, { animate: false });
  const S = pz.getScale();               // фактический zoom

  /* 3. центр bbox в координатах SVG-корня */
  const bbox = el.getBBox();
  const pt   = svg.createSVGPoint();
  pt.x = bbox.x + bbox.width  / 2;
  pt.y = bbox.y + bbox.height / 2;
  const gpt  = pt.matrixTransform(el.getCTM()!);

  /* 4. середина контейнера */
  const parent = svg.parentElement as HTMLElement;
  const viewCx = parent.clientWidth  / 2;
  const viewCy = parent.clientHeight / 2;

  /* 5. новый абсолютный pan ⟵ правильная формула */
  const panX = viewCx / S - gpt.x;
  const panY = viewCy / S - gpt.y;

  pz.pan(panX, panY, { animate: true, duration: 400 });
}

</script>

<template>
  <!-- Begin wrapping all content in a container that uses vertical stacking -->
  <div class="app-container">
    <!-- Add search bar above the carousel with tooltip-like styling -->
    <div class="search-container" ref="searchContainer">
      <input
        type="text"
        v-model="searchQuery"
        placeholder="Search routes, blocks, or areas..."
        @focus="isSearchActive = true"
        class="search-input"
      />
      
      <!-- Clear search button -->
      <button 
        v-if="searchQuery.length > 0"
        @click="searchQuery = ''; isSearchActive = false"
        class="clear-search-button"
        aria-label="Clear search"
        type="button"
      >
        ×
      </button>
      
      <!-- Quick Navigation Button -->
      <button 
        @click="quickNavigate"
        class="quick-nav-button"
        aria-label="Quick navigation"
        type="button"
      >
        <span class="map-icon">📍</span>
      </button>
      
      <!-- Search results dropdown with tooltip-like styling -->
      <div v-if="isSearchActive && searchResults.length > 0" class="search-results">
        <div 
          v-for="(result, index) in searchResults" 
          :key="index" 
          class="search-result-item"
          @click="selectSearchResult(result)"
        >
          <div class="result-name">{{ result.name }}</div>
          <div class="result-details">
            <div class="result-location">
              <span class="result-area">{{ result.area }} - <span class="result-block">{{ result.blockNumber }}</span></span>
            </div>
             <DifficultyLabel :difficulty="result.formattedDifficulty" />
            <!-- <div class="difficulty-badge">{{ result.formattedDifficulty }}</div> -->
          </div>
        </div>
      </div>
    </div>
    
    <!-- <AreaCarousel 
      :area-names="areaNames" 
      :selected-index="selectedAreaIndex" 
      @next="nextArea" 
      @prev="prevArea"
    /> -->
    
    <div id="map" ref="mapContainer">
      <div class="map-wrapper" >
        <svg 
          ref="mapSvg"
          viewBox="0 0 1280 800"
          width="100%"       
          height="100%"
          preserveAspectRatio="xMidYMid meet"
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

          <circle 
            v-if="viewBoxCenter" 
            :cx="viewBoxCenter.x" 
            :cy="viewBoxCenter.y" 
            r="4" 
            fill="blue" 
            stroke-width="4"
          />

          <circle 
            v-if="targetCenter" 
            :cx="targetCenter.x" 
            :cy="targetCenter.y" 
            r="4" 
            fill="green" 
            stroke-width="4"
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
  background-color: rgba(143, 136, 135, 0.106);
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

/* Search Component Styles that match tooltip */
.search-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 150; /* Above carousel */
  padding: 10px;
  background-color: rgba(91, 86, 86, 0.969);
  position: relative; /* Add position relative for absolute positioning of button */
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  /* border: 1px solid rgba(255, 255, 255, 0.2); */
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  color: white;
}

/* Clear search button styles */
.clear-search-button {
  position: absolute;
  right: 20px;
  top: 18px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  color: white;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  z-index: 152;
  transition: background-color 0.2s ease;
}

.clear-search-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.clear-search-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4);
}

/* Quick navigation button styles */
.quick-nav-button {
  position: absolute;
  right: 60px; /* Position to the left of clear button */
  top: 18px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  color: white;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  z-index: 152;
  transition: background-color 0.2s ease;
}

.quick-nav-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.quick-nav-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4);
}

.map-icon {
  display: inline-block;
  transform: translateY(-1px); /* Slight adjustment for visual alignment */
}

/* Search results dropdown styles */
.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: rgba(91, 86, 86, 0.969); /* Match tooltip background */
  color: white; /* Match tooltip text color */
  border-radius: 0 0 8px 8px;
  max-height: 300px;
  overflow-y: auto;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5); /* Match tooltip shadow */
  border: 1px solid rgba(255, 255, 255, 0.2); /* Match tooltip border */
  z-index: 151;
  scrollbar-width: none; /* Hide scrollbar for Firefox */
  -ms-overflow-style: none; /* Hide scrollbar for IE and Edge */
}

.search-results::-webkit-scrollbar {
  display: none; /* Hide scrollbar for Chrome, Safari and Opera */
}

.search-result-item {
  padding: 10px 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
}

.search-result-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.result-name {
  font-weight: 300;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}

.result-location {
  
  display: flex;
  flex-direction: column;
}

.result-block {
  /* font-weight: bold; */
  font-size: 12px;
}

.result-area {
   font-weight: bold;
  color: #ccc;
  font-size: 11px;
}

.difficulty-badge {
  background-color: #444;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 10px;
  min-width: 28px;
  text-align: center;
}

/* Update carousel position to account for search bar */
:deep(.carousel-container) {
  top: 50px; /* Position below search bar */
}

/* Update map position to account for search bar */
#map {
  top: 55px; /* Additional space for search bar */
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