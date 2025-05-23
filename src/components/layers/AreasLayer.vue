<script setup lang="ts">
import type { SvgObject } from '@/types/SvgObject';

defineProps({
  areas: {
    type: Array as () => SvgObject[],
    required: true
  },
  selectedArea: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['select-area', 'hover']);

const selectArea = (name: string) => {
  emit('select-area', name);
};

const setHoveredArea = (name: string | null) => {
  emit('hover', name);
};
</script>

<template>
  <g class="areas-layer">
    <path
      v-for="(area, index) in areas"
      :key="index"
      :id="area.name"
      :d="area.absolutePath"
      :fill="area.fill"
      :opacity="selectedArea === area.name ? 0.3 : 0.1"
      stroke="#444"
      stroke-width="1"
      stroke-linejoin="round"
      stroke-dasharray="4 4"
      class="shared-path-style"
      @click="selectArea(area.name)"
      @mouseover="setHoveredArea(area.name)"
      @mouseleave="setHoveredArea(null)"
    />
  </g>
</template>
