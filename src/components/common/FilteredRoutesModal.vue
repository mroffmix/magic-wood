<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import DifficultyLabel from '@/components/common/DifficultyLabel.vue';
import { getDifficultyValue } from '@/utils/difficulty';

// Route interface
interface Route {
  id: string | number;
  name: string;
  area: string;
  blockNumber: string;
  starscount: number;
  difficulty: string;
  link?: string;
}

const props = defineProps({
  routes: {
    type: Array as () => Route[],
    required: true
  },
  minDifficulty: {
    type: String,
    required: true
  },
  maxDifficulty: {
    type: String,
    required: true
  },
  isVisible: {
    type: Boolean,
    default: false
  }
});

// State for collapsible areas and star filtering
const expandedAreas = ref<Set<string>>(new Set());
const showOnlyStarred = ref(false);

const emit = defineEmits(['close', 'select-route']);

const closeModal = () => {
  emit('close');
};

// Filter routes by difficulty and stars
const filteredRoutes = computed(() => {
  const minValue = getDifficultyValue(props.minDifficulty);
  const maxValue = getDifficultyValue(props.maxDifficulty);
  
  return props.routes.filter(route => {
    const routeValue = getDifficultyValue(route.difficulty);
    const withinDifficulty = routeValue >= minValue && routeValue <= maxValue;
    
    // If showOnlyStarred is true, only include routes with stars
    const hasStars = showOnlyStarred.value ? route.starscount > 0 : true;
    
    return withinDifficulty && hasStars;
  });
});

// Group routes by area/sector
const groupedRoutes = computed(() => {
  const groups: { [key: string]: Route[] } = {};
  
  filteredRoutes.value.forEach(route => {
    const groupKey = route.area;
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(route);
  });
  
  // Sort routes within each group by difficulty
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => getDifficultyValue(a.difficulty) - getDifficultyValue(b.difficulty));
  });
  
  return groups;
});

// Get sorted group keys
const sortedGroupKeys = computed(() => {
  return Object.keys(groupedRoutes.value).sort();
});

// Handle route selection
const selectRoute = (route: Route) => {
  emit('select-route', route);
  closeModal();
};

// Count total routes
const totalRoutes = computed(() => filteredRoutes.value.length);

// Functions for area expansion
const toggleArea = (areaKey: string) => {
  if (expandedAreas.value.has(areaKey)) {
    expandedAreas.value.delete(areaKey);
  } else {
    expandedAreas.value.add(areaKey);
  }
};

const isAreaExpanded = (areaKey: string) => {
  return expandedAreas.value.has(areaKey);
};

// Expand all areas by default when modal opens
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    // Expand all areas when modal opens
    expandedAreas.value = new Set(sortedGroupKeys.value);
  }
});

// Toggle star filtering
const toggleStarFilter = () => {
  showOnlyStarred.value = !showOnlyStarred.value;
};

// Count starred routes
const starredRoutesCount = computed(() => {
  return filteredRoutes.value.filter(route => route.starscount > 0).length;
});
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="header-info">
          <h3>🗺️ Filtered Routes</h3>
          <div class="route-count">{{ totalRoutes }} routes found</div>
          <div class="filter-controls">
            <button 
              @click="toggleStarFilter"
              :class="['star-filter-btn', { active: showOnlyStarred }]"
              type="button"
            >
              ⭐ Only starred ({{ starredRoutesCount }})
            </button>
          </div>
        </div>
        <button class="close-button" @click="closeModal">×</button>
      </div>
      
      <div class="modal-body">
        <div v-if="totalRoutes > 0" class="groups-container">
          <div v-for="groupKey in sortedGroupKeys" :key="groupKey" class="route-group">
            <div class="group-header" @click="toggleArea(groupKey)">
              <div class="group-header-left">
                <span class="expand-icon">{{ isAreaExpanded(groupKey) ? '▼' : '▶' }}</span>
                <h4>🧗🏻 {{ groupKey }}</h4>
              </div>
              <span class="group-count">({{ groupedRoutes[groupKey].length }} routes)</span>
            </div>
            
            <div v-if="isAreaExpanded(groupKey)" class="routes-list">
              <div 
                v-for="route in groupedRoutes[groupKey]" 
                :key="route.id" 
                class="route-item"
                @click="selectRoute(route)"
              >
                <div class="route-info">
                  <div class="route-name">{{ route.name }}</div>
                  <div class="route-block">{{ route.blockNumber }}</div>
                </div>
                <div class="route-stars">
                  <span v-for="i in route.starscount" :key="i" class="star">★</span>
                </div>
                <div class="difficulty-container">
                  <DifficultyLabel :difficulty="route.difficulty" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="no-routes">
          No routes found matching the current difficulty filter
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
}

.modal-content {
  background-color: rgba(91, 86, 86, 0.969);
  color: white;
  border-radius: 8px;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  background-color: rgba(91, 86, 86, 0.969);
}

.header-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.route-count {
  font-size: 12px;
  color: #ccc;
  margin-top: 4px;
}

.filter-controls {
  margin-top: 8px;
}

.star-filter-btn {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.star-filter-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.star-filter-btn.active {
  background: rgba(255, 215, 0, 0.3);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.5);
}

.close-button {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  width: 32px;
  height: 32px;
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
  font-size: 18px;
  font-weight: 700;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.modal-body::-webkit-scrollbar {
  display: none;
}

.groups-container {
  padding: 15px 20px;
}

.route-group {
  margin-bottom: 25px;
}

.route-group:last-child {
  margin-bottom: 0;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.group-header:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.group-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-icon {
  font-size: 12px;
  color: #ccc;
  transition: transform 0.2s;
  min-width: 16px;
}

.group-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.group-count {
  font-size: 12px;
  color: #aaa;
}

.routes-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.route-item {
  display: grid;
  grid-template-columns: 2fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.route-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.route-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.route-name {
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  line-height: 1.2;
}

.route-block {
  font-size: 11px;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.1;
}

.route-stars {
  color: gold;
  text-align: right;
  flex-shrink: 0;
  font-size: 13px;
}

.difficulty-container {
  display: flex;
  justify-content: flex-end;
  min-width: 45px;
}

.no-routes {
  font-style: italic;
  opacity: 0.7;
  text-align: center;
  margin: 40px 20px;
  font-size: 16px;
}

/* Desktop-specific adjustments */
@media (min-width: 768px) {
  .modal-content {
    max-width: 700px;
  }
  
  .modal-header {
    padding: 20px 25px;
  }
  
  h3 {
    font-size: 20px;
  }
  
  .route-count {
    font-size: 14px;
  }
  
  .groups-container {
    padding: 20px 25px;
  }
  
  .group-header h4 {
    font-size: 18px;
  }
  
  .group-count {
    font-size: 14px;
  }
  
  .route-item {
    padding: 10px 15px;
    gap: 12px;
  }
  
  .route-name {
    font-size: 16px;
  }
  
  .route-block {
    font-size: 12px;
  }
  
  .route-stars {
    font-size: 15px;
  }
  
  .close-button {
    font-size: 28px;
    width: 36px;
    height: 36px;
  }
  
  .no-routes {
    font-size: 18px;
    margin: 50px 25px;
  }
}

/* Mobile-specific adjustments */
@media (max-width: 767px) {
  .modal-overlay {
    padding: 10px;
  }
  
  .modal-content {
    max-height: 85vh;
  }
  
  .modal-header {
    padding: 12px 15px;
  }
  
  h3 {
    font-size: 16px;
  }
  
  .groups-container {
    padding: 12px 15px;
  }
  
  .route-item {
    padding: 6px 8px;
    gap: 8px;
  }
  
  .route-name {
    font-size: 13px;
  }
  
  .route-block {
    font-size: 10px;
  }
}
</style>