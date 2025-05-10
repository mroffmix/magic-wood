<script setup lang="ts">
import { ref } from 'vue';
import { applyShiftPath, getPathCenter } from './utils/shiftPath';
import { areas } from './map-data/areas'; 
import { tracks } from './map-data/tracks';
import { semTrack } from './map-data/sem-track';
import { crags } from './map-data/crags';
import { e_crags } from './map-data/e-crags'; 
import AreasLayer from './components/layers/AreasLayer.vue';
import TracksLayer from './components/layers/TracksLayer.vue';
import CragsLayer from './components/layers/CragsLayer.vue';

applyShiftPath(areas);
applyShiftPath(tracks);
applyShiftPath(crags);
applyShiftPath(e_crags);
applyShiftPath(semTrack);

const selectedArea = ref<string | undefined>(undefined); // Track the selected area
const hoveredArea = ref<string | null>(null); // Track the hovered area

const selectArea = (name: string) => {
  selectedArea.value = name;
};

</script>

<template>
  <div id="map">
    <svg 
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
      />
    </svg>
  </div>
</template>

<style scoped>

.absolute {
  position: absolute;  
}
.cursor-pointer {
  cursor: pointer; /* Add pointer cursor for interactivity */
}
.touch-zoom-pan {
  touch-action: manipulation; /* важно для мобильного взаимодействия */
}
/* Добавьте это правило, чтобы div занимал всю доступную область */
#map {
  width: 150vw;
  height: 150vh;
  margin-top: 50px;
  margin-left: 0;
  /* Убираем центрирование, если было */
  /* display: block; */
  /* left: 0; */
}

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

</style>

<style>
body {
  background-color: white; /* Ensure the entire page has a white background */
  margin: 0;
  padding: 0;
}
</style>
