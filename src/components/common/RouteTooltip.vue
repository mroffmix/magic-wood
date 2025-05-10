<script setup lang="ts">
import type { SvgObject } from '@/types/SvgObject';
import { computed } from 'vue';
import DifficultyLabel from '@/components/common/DifficultyLabel.vue';

// Add interface for route object
interface Route {
  id: string | number;
  name: string;
  area: string;
  starscount: number;
  difficulty: string;
  link?: string;
  sector?: string; // Add sector property
}

const props = defineProps({
  selectedCrag: {
    type: Object as () => SvgObject,
    required: true
  },
  cragRoutes: {
    type: Array as () => Route[],
    required: true
  }
});

const emit = defineEmits(['close']);

const closeTooltip = () => {
  emit('close');
};
</script>

<template>
  <foreignObject 
    width="250" 
    height="200" 
    @click.stop="closeTooltip"
  >
    <div 
      xmlns="http://www.w3.org/1999/xhtml" 
      class="tooltip"
    >
      <div class="tooltip-header">
        <div class="header-info">
          <h3><b>🧗🏻{{ selectedCrag.sector }}</b> ({{ selectedCrag.name }})</h3>
        </div>
        <button class="close-button" @click="closeTooltip">×</button>
      </div>
      
      <div class="tooltip-content">
        <div v-if="cragRoutes.length" class="routes-list">
          <div v-for="route in cragRoutes" :key="route.id" class="route-item">
            <div class="route-info">
              <a 
                :href="route.link || '#'" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="route-link"
                @click.stop
              >
                <div class="route-name">{{ route.name }}</div>
                <!-- <div class="route-area">{{ route.area }}</div> -->
              </a>
            </div>
            <div class="route-stars">
              <span v-for="i in route.starscount" :key="i" class="star">★</span>
            </div>
            <div class="difficulty-container">
              <DifficultyLabel :difficulty="route.difficulty" />
            </div>
          </div>
        </div>
        <div v-else class="no-routes">
          No routes found for this block
        </div>
      </div>
    </div>
  </foreignObject>
</template>

<style scoped>
.tooltip {
  background-color: rgba(91, 86, 86, 0.969);
  color: white;
  padding: 0;
  border-radius: 8px;
  font-size: 10px;
  pointer-events: auto;
  width: 100%;
  height: 100%;
  max-height: 200px;
  box-sizing: border-box;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  /* border: 1px solid rgba(255, 255, 255, 0.2); */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tooltip-header {
  top: 0;
  background-color: rgba(91, 86, 86, 0.969);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  margin-bottom: 0;
  width: 100%;
  box-sizing: border-box;
}

.header-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  overflow: hidden;
}

.sector-name {
  font-size: 8px;
  color: #aaa;
  margin-bottom: 2px;
  text-align: left;
}

.tooltip-content {
  overflow-y: auto;
  padding: 6px;
  flex: 1;
  scrollbar-width: none; /* Hide scrollbar for Firefox */
  -ms-overflow-style: none; /* Hide scrollbar for IE and Edge */
  width: 100%;
}

/* Hide scrollbar for Chrome, Safari and Opera */
.tooltip-content::-webkit-scrollbar {
  display: none;
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

h3 b {
  font-weight: 700;
  color: #ffffff; /* Brighter white for the sector */
}

.routes-list {
  display: flex;
  flex-direction: column;
  gap: 2px; /* Reduced from 4px */
  overflow: visible; /* Allow content to be scrollable within the parent */
}

.route-item {
  display: grid;
  grid-template-columns: 2fr auto auto;
  align-items: center;
  gap: 3px; /* Reduced slightly */
  padding: 2px 0; /* Reduced from 3px */
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.route-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.route-link {
  color: inherit;
  text-decoration: none;
  display: block;
  overflow: hidden;
}

.route-link:hover .route-name {
  text-decoration: underline;
  color: #add8e6;
}

.route-name {
  font-weight: 300;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 9px; /* Slightly reduced font size */
  line-height: 1.2; /* Tighter line height */
}

.route-area {
  font-size: 6px; /* Reduced from 7px */
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.1; /* Tighter line height */
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
