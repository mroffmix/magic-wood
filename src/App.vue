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
</template>

<style scoped>
.map-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: manipulation;
  border: 1px solid rgb(75, 75, 75);
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
</style>

<style>
body {
  background-color: white;
  margin: 0;
  padding: 0;
}
</style>