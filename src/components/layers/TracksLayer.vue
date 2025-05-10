<script setup lang="ts">
import type { SvgObject } from '@/types/SvgObject';

defineProps({
  tracks: {
    type: Array as () => SvgObject[],
    required: true
  },
  semTracks: {
    type: Array as () => SvgObject[],
    required: true
  }
});
</script>

<template>
  <g class="tracks-layer">
    <path
      v-for="(track, index) in tracks"
      :key="index"
      :id="track.name"
      :d="track.absolutePath"
      :fill="track.fill"
      :opacity="0.9"
      stroke-width="0.7"
      stroke-dasharray="4 2"
    />
    <path
      v-for="(strack, index) in semTracks"
      :key="`sem-${index}`"
      :id="strack.name"
      :d="strack.absolutePath"
      stroke="#222"
      stroke-width="0.7"
      :opacity="0.7"
      fill="none"
      stroke-dasharray="4 2"
    />
  </g>
</template>
