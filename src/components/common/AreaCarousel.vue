<script setup lang="ts">
defineProps({
  areaNames: {
    type: Array as () => string[],
    required: true
  },
  selectedIndex: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['next', 'prev']);

const handleNext = () => {
  emit('next');
};

const handlePrev = () => {
  emit('prev');
};
</script>

<template>
  <div class="carousel-container">
    <button class="carousel-btn" @click="handlePrev">&#8592;</button>
    <span class="carousel-text"><h3>{{ areaNames[selectedIndex] }}</h3></span>
    <button class="carousel-btn" @click="handleNext">&#8594;</button>
  </div>
</template>

<style scoped>
.carousel-container {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 10px;
  color: white;
  background-color: rgba(50, 50, 50, 0.7); /* Added transparency */
  /* border-radius: 0 0 8px 8px; */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.carousel-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  color: white;
  cursor: pointer;
  padding: 8px 15px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.carousel-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.carousel-text {
  font-size: 1.2rem;
  font-weight: bold;
}

.carousel-text h3 {
  margin: 0;
  font-size: 16px;
}
</style>
