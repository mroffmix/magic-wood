<script setup lang="ts">
import type { SvgObject } from '@/types/SvgObject';
import { ref, computed } from 'vue';

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
  }
});

const emit = defineEmits(['select-area', 'hover', 'select-crag']);

const selectArea = (crag: SvgObject, event: MouseEvent) => {
  emit('select-area', crag.name);
  emit('select-crag', crag);
};

const setHoveredArea = (name: string | null) => {
  emit('hover', name);
};
</script>

<template>
  <g class="crags-layer">
    <!-- Easy crags -->
    <path
      v-for="(crag, index) in eCrags"
      :key="`e-${index}`"
      :id="crag.name"
      :d="crag.absolutePath"
      fill="url(#lightCragGradient)"
      stroke="none"
      :opacity="1"
    />
    
    <!-- Regular crags -->
    <path
      v-for="(crag, index) in crags"
      :key="index"
      :id="crag.name"
      :d="crag.absolutePath"
      fill="url(#cragGradient)"
      :opacity="1"
      stroke="#222"
      stroke-width="0.7"
      @click="(event) => selectArea(crag, event)"
      @mouseover="setHoveredArea(crag.name)"
      @mouseleave="setHoveredArea(null)"
    />
    
    <!-- Crag labels -->
    <text
      v-for="(crag, index) in crags"
      :key="'label-' + index"
      :x="getPathCenter(crag.path, crag.x, crag.y).x"
      :y="getPathCenter(crag.path, crag.x, crag.y).y"
      text-anchor="middle"
      alignment-baseline="middle"
      font-size="6"
      fill="#fff"
      font-weight="bold"
      pointer-events="none"
      style="user-select: none;"
    >
      <tspan
        :x="getPathCenter(crag.path, crag.x, crag.y).x"
        :y="getPathCenter(crag.path, crag.x, crag.y).y"
        :style="{ 
          fontSize: '4px', 
          whiteSpace: 'pre', 
        }"
      >{{ crag.name }}</tspan>
    </text>
  </g>
</template>

<style scoped>
.tooltip {
  background-color: rgba(91, 86, 86, 0.969);
  color: white;
  padding: 6px;
  border-radius: 8px;
  font-size: 10px;
  pointer-events: auto;
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
