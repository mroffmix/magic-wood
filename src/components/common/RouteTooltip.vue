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
  
  border-radius: 8px;
  font-size: 14px; /* Increased from 10px */
  pointer-events: auto;
  width: 100%;
  height: 100%;
  max-height: 500px; /* Increased max height */
  box-sizing: border-box;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tooltip-header {
  top: 0;
  /* background-color: rgba(91, 86, 86, 0.969); */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px; /* Increased from 6px */
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  margin-bottom: 5px; /* Added some margin */
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
  font-size: 12px; /* Increased from 8px */
  color: #aaa;
  margin-bottom: 4px; /* Increased from 2px */
  text-align: left;
}

.tooltip-content {
  overflow-y: auto;
  padding: 6px 10px; /* Reduced vertical padding from 10px */
  flex: 1;
  scrollbar-width: none;
  -ms-overflow-style: none;
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
  font-size: 24px; /* Increased from 18px */
  cursor: pointer;
  width: 32px; /* Increased from 24px */
  height: 32px; /* Increased from 24px */
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
  font-size: 16px; /* Increased from 10px */
  text-align: left;
}

h3 b {
  font-weight: 700;
  color: #ffffff; /* Brighter white for the sector */
}

.routes-list {
  display: flex;
  flex-direction: column;
  gap: 2px; /* Reduced from 6px */
  overflow: visible;
}

.route-item {
  display: grid;
  grid-template-columns: 2fr auto auto;
  align-items: center;
  gap: 6px; /* Reduced from 8px */
  padding: 4px 0; /* Reduced from 8px */
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
  font-weight: 400; /* Slightly increased */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px; /* Reduced from 14px */
  line-height: 1.1; /* Reduced from 1.2 */
}

.route-area {
  font-size: 11px; /* Reduced from 12px */
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.1; /* Reduced from 1.2 */
}

.difficulty-container {
  display: flex;
  justify-content: flex-end;
  min-width: 40px;
}

.route-stars {
  color: gold;
  margin-right: 6px; /* Reduced from 8px */
  text-align: right;
  flex-shrink: 0;
  font-size: 13px; /* Reduced from 14px */
}

.no-routes {
  font-style: italic;
  opacity: 0.7;
  text-align: center;
  margin-top: 30px; /* Increased from 20px */
  font-size: 16px; /* Added larger font size */
}

/* Desktop-specific adjustments */
@media (min-width: 768px) {
  .tooltip {
    font-size: 16px;
    padding: 10px;
  }
  
  h3 {
    font-size: 20px;
  }
  
  .tooltip-header {
    padding: 12px 15px;
  }
  
  .route-name {
    font-size: 16px;
    line-height: 1.3;
  }
  
  .route-stars {
    font-size: 16px;
    margin-right: 10px;
  }
  
  .route-item {
    padding: 6px 0;
    gap: 10px;
  }
  
  .close-button {
    font-size: 28px;
    width: 36px;
    height: 36px;
  }
  
  .tooltip-content {
    padding: 10px 15px;
  }
  
  .no-routes {
    font-size: 18px;
  }
}
</style>
