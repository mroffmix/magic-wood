<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
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
import DifficultyLabel from '@/components/common/DifficultyLabel.vue';
import FilteredRoutesModal from '@/components/common/FilteredRoutesModal.vue';
import routesData from '@/routes-data/filled_routes.json';
import type { SvgObject } from '@/types/SvgObject';
import { getDifficultyValue } from '@/utils/difficulty';
import { useInteractionHandler } from '@/utils/interaction';

applyShiftPath(areas);
applyShiftPath(tracks);
applyShiftPath(crags);
applyShiftPath(e_crags);
applyShiftPath(semTrack);

const selectedArea = ref<string | undefined>(undefined);
const hoveredArea = ref<string | null>(null);

const showTooltip = ref(false);
const selectedCrag = ref<SvgObject | null>(null);
const panZoomScale = ref(3); // Default value, will be updated based on device

// Initialize interaction handler to detect drag vs click
const interactionHandler = useInteractionHandler(8); // 8px drag threshold

// Track panzoom drag state
const isPanZooming = ref(false);
const hadPanMovement = ref(false);
const isProgrammaticMove = ref(false); // Track when focusOn is moving the map

// Filtered routes modal state
const showFilteredRoutesModal = ref(false);

// Starred crags visibility state
const showStarredCrags = ref(false);

// Handle route selection from modal
const handleRouteSelection = (route: { blockNumber: string; area: string; [key: string]: unknown }) => {
  // console.log('Selected route:', route);
  
  // Find the corresponding crag for this route
  const correspondingCrag = [...crags, ...e_crags].find(crag => 
    crag.name === route.blockNumber && crag.sector === route.area
  );
  
  if (correspondingCrag) {
    // console.log('Found corresponding crag:', correspondingCrag);
    handleSelectCrag(correspondingCrag, true); // Bypass filter for route selection
  } else {
    // console.log('No corresponding crag found for route:', route);
  }
};


const getRoutesByCrag = (cragName: string, cragSector: string) => {
  // console.log('Looking for routes with cragName:', cragName);
  // console.log('Looking for routes with cragSector:', cragSector);
  
  // Debug the routes data a bit
  // console.log('Total routes in database:', routesData.length);
  
  // Get routes by sector first
  const sectorRoutes = routesData.filter(route => route.area === cragSector);
  // console.log('Routes matching sector:', sectorRoutes.length);
  
  // Then filter by block name
  const blockRoutes = sectorRoutes.filter(route => route.blockNumber === cragName);
  // console.log('Routes matching both sector and block:', blockRoutes.length);
  
  // Finally filter by difficulty
  const validRoutes = blockRoutes.filter(route => route.difficulty && route.difficulty.trim() !== '');
  // console.log('Final filtered routes with valid difficulty:', validRoutes);
  
  return validRoutes;
};

const cragRoutes = computed(() => {
  if (!selectedCrag.value) return [];
  
  // Get all routes for the selected crag
  const routes = getRoutesByCrag(selectedCrag.value.name, selectedCrag.value.sector || '');
  
  // Get numeric values for min and max difficulty
  const minDifficultyValue = getDifficultyValue(minDifficulty.value);
  const maxDifficultyValue = getDifficultyValue(maxDifficulty.value);
  
  // Filter routes by difficulty
  return routes.filter(route => {
    const routeDifficultyValue = getDifficultyValue(route.difficulty);
    
    // Include route if its difficulty is within the filter range
    return routeDifficultyValue >= minDifficultyValue && 
           routeDifficultyValue <= maxDifficultyValue;
  });
});

// Add computed property for filtered out routes
const filteredOutRoutes = computed(() => {
  if (!selectedCrag.value) return [];
  
  // Get all routes for the selected crag
  const allRoutes = getRoutesByCrag(selectedCrag.value.name, selectedCrag.value.sector || '');
  
  // Get numeric values for min and max difficulty
  const minDifficultyValue = getDifficultyValue(minDifficulty.value);
  const maxDifficultyValue = getDifficultyValue(maxDifficulty.value);
  
  // Filter out routes that don't match the difficulty range
  return allRoutes.filter(route => {
    const routeDifficultyValue = getDifficultyValue(route.difficulty);
    
    // Include routes outside the filter range
    return routeDifficultyValue < minDifficultyValue || routeDifficultyValue > maxDifficultyValue;
  });
});

const selectArea = () => {
  return;
};

const handleSelectCrag = (crag: SvgObject, bypassFilter = false) => {
  const state = interactionHandler.getState();
  const timeSinceDrag = state.lastDragEndTime > 0 ? Date.now() - state.lastDragEndTime : 'N/A';
  
  // Debug interaction state
   console.log('handleSelectCrag called, interaction state:', {
    ...state,
    timeSinceDragEnd: timeSinceDrag,
    isPanZooming: isPanZooming.value,
    hadPanMovement: hadPanMovement.value
  });
  
  // Check if we're currently pan/zooming with movement or if it just ended with movement
  if (isPanZooming.value && hadPanMovement.value) {
    // console.log('Click ignored - pan/zooming with movement');
    return;
  }
  
  // Check if this is a valid click (not a drag)
  if (!interactionHandler.isValidClick()) {
     console.log('Click ignored - invalid click, state:', {
      ...state,
      timeSinceDragEnd: timeSinceDrag
    });
    return;
  }
  
  // console.log('handleSelectCrag called for:', crag.name, crag.sector);
  
  // Get routes for this crag before proceeding
  const allRoutes = getRoutesByCrag(crag.name, crag.sector || '');
  // console.log('All routes count:', allRoutes.length);
  
  // Check if there are any routes before continuing
  if (allRoutes.length === 0) {
    // console.log('No routes found for this crag, skipping tooltip');
    return;
  }
  
  // Check if there are any visible routes (matching current filter)
  // Skip this check if called from search (bypassFilter = true)
  if (!bypassFilter) {
    const minDifficultyValue = getDifficultyValue(minDifficulty.value);
    const maxDifficultyValue = getDifficultyValue(maxDifficulty.value);
    
    const visibleRoutes = allRoutes.filter(route => {
      const routeDifficultyValue = getDifficultyValue(route.difficulty);
      return routeDifficultyValue >= minDifficultyValue && 
             routeDifficultyValue <= maxDifficultyValue;
    });
    
    if (visibleRoutes.length === 0) {
      // console.log('No visible routes found for this crag with current filter, skipping tooltip');
      return;
    }
  }
  
  selectedCrag.value = crag;
  showTooltip.value = true;

  focusOn(crag, bypassFilter);
};

const hideTooltip = () => {
  showTooltip.value = false;
};

// Add debug reference for the center point
const debugCenter = ref<{ x: number, y: number } | null>(null);
const viewBoxCenter = ref<{ x: number, y: number } | null>(null);
const targetCenter = ref<{x: number, y: number} | null>(null);

// Pan-Zoom Integration
const mapSvg = ref<SVGSVGElement | null>(null);
const mapContainer = ref<HTMLElement | null>(null);
let panZoomInstance: ReturnType<typeof Panzoom> | null = null;

// Calculate and apply boundary constraints
const applyBoundaryConstraints = () => {
  if (!panZoomInstance || !mapContainer.value || !mapSvg.value) return;
  
  const container = mapContainer.value;
  const containerRect = container.getBoundingClientRect();
  const svgViewBox = { width: 1280, height: 800 }; // SVG viewBox dimensions
  
  const scale = panZoomInstance.getScale();
  const scaledWidth = svgViewBox.width * scale;
  const scaledHeight = svgViewBox.height * scale;
  
  // Allow larger margin (50% of container size) to enable focusing on edge elements
  const marginX = containerRect.width * 0.5;
  const marginY = containerRect.height * 0.5;
  
  // Calculate bounds that keep most of the map visible
  const minX = Math.min(-marginX, containerRect.width - scaledWidth + marginX);
  const maxX = Math.max(marginX, scaledWidth - containerRect.width - marginX);
  const minY = Math.min(-marginY, containerRect.height - scaledHeight + marginY);
  const maxY = Math.max(marginY, scaledHeight - containerRect.height - marginY);
  
  // Get current pan position
  const pan = panZoomInstance.getPan();
  let newX = pan.x;
  let newY = pan.y;
  
  // Constrain to boundaries
  if (newX < minX) newX = minX;
  if (newX > maxX) newX = maxX;
  if (newY < minY) newY = minY;
  if (newY > maxY) newY = maxY;
  
  // Apply constraints if needed
  if (newX !== pan.x || newY !== pan.y) {
    panZoomInstance.pan(newX, newY, { animate: false });
  }
};

// Handle window resize to recalculate boundaries
const handleResize = () => {
  if (panZoomInstance) {
    requestAnimationFrame(applyBoundaryConstraints);
  }
};

onMounted(() => {
  if (mapSvg.value && mapContainer.value) {
    // Setup interaction handlers for both the container and SVG to capture all events
    interactionHandler.setupEventListeners(mapContainer.value);
    interactionHandler.setupEventListeners(mapSvg.value);
    // Detect if the device is mobile or desktop
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Set different zoom scales based on device type
    panZoomScale.value = isMobile ? 10 : 4;
    

    panZoomInstance = Panzoom(mapSvg.value, zoomConfig.value);
    
    // Track panzoom events to prevent clicks during actual pan/zoom
    mapSvg.value.addEventListener('panzoomstart', () => {
      // console.log('Panzoom start - setting isPanZooming to true');
      isPanZooming.value = true;
      hadPanMovement.value = false; // Reset movement flag
      
      // Hide tooltip only if this is user-initiated movement (not programmatic)
      if (!isProgrammaticMove.value) {
        showTooltip.value = false;
      }
    });
    
    mapSvg.value.addEventListener('panzoompan', () => {
      // console.log('Panzoom pan - actual movement detected');
      hadPanMovement.value = true;
      // Apply boundary constraints during panning
      requestAnimationFrame(applyBoundaryConstraints);
      
      // Hide tooltip only if this is user-initiated movement (not programmatic)
      if (!isProgrammaticMove.value) {
        showTooltip.value = false;
      }
    });
    
    mapSvg.value.addEventListener('panzoomzoom', () => {
      // console.log('Panzoom zoom - actual movement detected');
      hadPanMovement.value = true;
      // Apply boundary constraints after zooming
      requestAnimationFrame(applyBoundaryConstraints);
      
      // Hide tooltip only if this is user-initiated movement (not programmatic)
      if (!isProgrammaticMove.value) {
        showTooltip.value = false;
      }
    });
    
    mapSvg.value.addEventListener('panzoomend', () => {
      // console.log('Panzoom end - hadPanMovement:', hadPanMovement.value);
      
      if (hadPanMovement.value) {
        // Only block clicks if there was actual pan/zoom movement
        // console.log('Had movement - will block clicks for a short time');
        setTimeout(() => {
          isPanZooming.value = false;
          hadPanMovement.value = false;
          // console.log('Reset isPanZooming to false after movement');
        }, 200);
      } else {
        // No movement, this was just a click - allow it immediately
        // console.log('No movement - allowing clicks immediately');
        isPanZooming.value = false;
        hadPanMovement.value = false;
      }
    });
    
    // Add wheel event handling
    mapSvg.value.parentElement?.addEventListener('wheel', panZoomInstance.zoomWithWheel);
    
    // Add double tap handling for mobile devices
    if (isMobile) {
      mapSvg.value.addEventListener('touchend', handleDoubleTap, { passive: false });
    }
    
    window.addEventListener('resize', handleResize);
    
    // Apply initial boundary constraints after setup
    setTimeout(() => {
      applyBoundaryConstraints();
    }, 100);

    // Center the panZoom instance using the parent's dimensions.
    const parent = mapSvg.value.parentElement;
    
   
    if (parent) {
      // const parentRect = parent.getBoundingClientRect();
      // const svgRect = mapSvg.value.getBoundingClientRect();
      // Calculate offset so that the SVG is centered in the parent.
      // const offsetX = (parentRect.width - svgRect.width) / 2;
      // const offsetY = (parentRect.height - svgRect.height) / 2;

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
  
  // Remove resize event listener
  window.removeEventListener('resize', handleResize);
  
  // Remove double tap event listener
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile && mapSvg.value) {
    mapSvg.value.removeEventListener('touchend', handleDoubleTap);
  }
  
  // Clean up interaction handlers
  if (mapContainer.value) {
    interactionHandler.removeEventListeners(mapContainer.value);
  }
  if (mapSvg.value) {
    interactionHandler.removeEventListeners(mapSvg.value);
    // Note: panzoom event listeners are automatically cleaned up when panzoom is destroyed
  }
});

// Add difficulty filter state with localStorage persistence
const minDifficulty = ref(localStorage.getItem('minDifficulty') || '2B');
const maxDifficulty = ref(localStorage.getItem('maxDifficulty') || '8C');

// Watch for changes and update localStorage
watch(minDifficulty, (newValue) => {
  localStorage.setItem('minDifficulty', newValue);
});

watch(maxDifficulty, (newValue) => {
  localStorage.setItem('maxDifficulty', newValue);
});

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
const selectSearchResult = (route: typeof routesData[0]) => {
  if (route.blockNumber) {
    // Find the corresponding crag
    const selectedCragObject = [...crags].find(c => 
      c.name === route.blockNumber && c.sector === route.area
    );
    
    if (selectedCragObject) {
      handleSelectCrag(selectedCragObject, true); // Bypass filter for search results
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

// Zoom configuration based on device type
const zoomConfig = computed(() => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return isMobile ? 
    {
      maxScale: 20,
      minScale: 2.5,
      step: 5,
      startScale: 3.5,
      touchAction: 'manipulation',
      doubleClickZoom: true
    } : 
    {
      maxScale: 8,
      minScale: 1.0,
      step: 0.1,
      startScale: 1.5,
      touchAction: 'manipulation',
      doubleClickZoom: true
    };
});

// Add quick navigation function
const quickNavigate = () => {
  const selectedCragObj = selectedCrag.value;
  if (selectedCragObj) {
    // panZoomInstance?.zoom(1, { animate: true });
    focusOn(selectedCragObj);
    
  }
};

// Reset zoom to default values
const resetZoom = () => {
  if (!panZoomInstance) return;
  
  // Reset to initial position and scale from config
  panZoomInstance.zoom(zoomConfig.value.startScale, { animate: true });
  panZoomInstance.pan(50, -50, { animate: true });
};

// Double tap handling for mobile zoom
let lastTouchEnd = 0;
let isZoomedIn = false;
const handleDoubleTap = (event: TouchEvent) => {
  // if (!panZoomInstance || !mapSvg.value) return;
  
  // const now = Date.now();
  // if (now - lastTouchEnd <= 300) {
  //   event.preventDefault();
    
  //   const touch = event.changedTouches[0];
    
  //   // Toggle between zoomed in and default scale
  //   if (!isZoomedIn) {
  //     // Zoom in to 2x the start scale
  //     const targetScale = zoomConfig.value.startScale * 2;
  //     panZoomInstance.zoomToPoint(targetScale, { clientX: touch.clientX, clientY: touch.clientY }, { animate: true });
  //     panZoomInstance.zoom(panZoomScale.value, { animate: true });
  //     isZoomedIn = true;
  //   } else {
  //     // Zoom out to default scale
  //     panZoomInstance.zoom(zoomConfig.value.startScale, { animate: true });
  //     isZoomedIn = false;
  //   }
  // }
  // lastTouchEnd = now;
};


function focusOn(crag: SvgObject, bypassTooltipCheck = false) {
  // Skip focusing if there are no routes to show (unless bypassing for search/route selection)
  if (!bypassTooltipCheck && !shouldShowTooltip.value) {
    // console.log('Skipping focus because no routes will be shown');
    return;
  }

  const svg = mapSvg.value!;
  const pz = panZoomInstance;
  if (!svg || !pz) return;

  /* 1. Find the target element */
  const el = svg.getElementById(crag.name + '_' + crag.sector) as SVGGraphicsElement | null;
  if (!el) return;

  /* 2. Mark as programmatic movement to prevent tooltip hiding */
  isProgrammaticMove.value = true;

  /* 3. Reset to scale 1 first for accurate calculations */
  pz.zoom(1, { animate: false });
  
  /* 4. Get element center coordinates */
  const bbox = el.getBBox();
  const elementCenterX = bbox.x + bbox.width / 2;
  const elementCenterY = bbox.y + bbox.height / 2;

  /* 5. Get container dimensions */
  const parent = svg.parentElement as HTMLElement;
  const containerCenterX = parent.clientWidth / 2;
  const containerCenterY = parent.clientHeight / 2;

  /* 6. Calculate pan with browser-specific handling */
  let panX, panY;
  
  const isFirefox = navigator.userAgent.includes('Firefox');
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isAndroidFirefox = isFirefox && isAndroid;
  
  if (isFirefox) {
    // Firefox-specific calculation using SVG viewBox scaling
    const viewBox = svg.viewBox.baseVal;
    let scaleX = parent.clientWidth / viewBox.width;
    let scaleY = parent.clientHeight / viewBox.height;
    
    // Additional adjustment for Android Firefox
    if (isAndroidFirefox) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      scaleX *= devicePixelRatio;
      scaleY *= devicePixelRatio;
    }
    
    panX = containerCenterX - (elementCenterX * scaleX);
    panY = containerCenterY - (elementCenterY * scaleY);
  } else {
    // Standard calculation for other browsers
    const pt = svg.createSVGPoint();
    pt.x = elementCenterX;
    pt.y = elementCenterY;
    const gpt = pt.matrixTransform(el.getCTM()!);
    
    panX = containerCenterX - gpt.x;
    panY = containerCenterY - gpt.y;
  }

  /* 7. Apply pan and zoom */
  pz.pan(panX, panY, { animate: true });
  pz.zoom(panZoomScale.value, { animate: true });
  isZoomedIn = true; // Set zoomed in state
  /* 8. Reset programmatic flag after a delay to allow animations to complete */
  setTimeout(() => {
    isProgrammaticMove.value = false;
  }, 1000);
}

// Function to determine if a crag is selected
const isCragSelected = (crag: SvgObject) => {
  return selectedCrag.value?.name === crag.name && selectedCrag.value?.sector === crag.sector;
};

// Updated computed properties to determine if tooltip should be shown
const hasVisibleRoutes = computed(() => {
  // Get all available routes for the selected crag, regardless of difficulty filter
  if (!selectedCrag.value) return false;
  
  const allRoutes = getRoutesByCrag(selectedCrag.value.name, selectedCrag.value.sector || '');
  // console.log('hasVisibleRoutes check - all routes:', allRoutes.length);
  // console.log('hasVisibleRoutes check - filtered out:', filteredOutRoutes.value.length);
  
  // Ensure we're working with lengths and not trying to subtract arrays
  const visibleRoutesCount = allRoutes.length - filteredOutRoutes.value.length;
  // console.log('hasVisibleRoutes result:', visibleRoutesCount > 0);
  
  return visibleRoutesCount > 0;
});

const shouldShowTooltip = computed(() => {
  const result = showTooltip.value && selectedCrag.value && hasVisibleRoutes.value;
   console.log('shouldShowTooltip =', result, {
    showTooltip: showTooltip.value,
    selectedCrag: !!selectedCrag.value,
    hasVisibleRoutes: hasVisibleRoutes.value
  });
  return result;
});

// Save for offline functionality
const saveForOffline = async () => {
  if ('serviceWorker' in navigator && 'caches' in window) {
    try {
      // Pre-cache all critical resources
      const cache = await caches.open('magic-wood-v2');
      
      // Cache current page and essential resources
      const resourcesToCache = [
        window.location.pathname,
        '/',
        '/index.html',
        '/favicon.ico',
        '/magic-wood.png'
      ];
      
      await cache.addAll(resourcesToCache);
      
      // Trigger service worker cache update
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({ type: 'CACHE_UPDATE' });
      }
      
      // Show user feedback
      const button = document.querySelector('.save-offline-button');
      if (button) {
        const originalContent = button.innerHTML;
        button.innerHTML = '<font-awesome-icon icon="check" class="check-icon" />';
        button.classList.add('saved');
        
        setTimeout(() => {
          button.innerHTML = originalContent;
          button.classList.remove('saved');
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to save for offline:', error);
    }
  }
};
</script>

<template>
  <!-- Begin wrapping all content in a container that uses vertical stacking -->
  <div class="app-container">
    <!-- Add search bar above the carousel with tooltip-like styling -->
    <div class="search-container" :class="{ 'with-modal': showFilteredRoutesModal }" ref="searchContainer">
      <!-- Action buttons group (moved to left) -->
      <div class="search-actions-group">
        <!-- Filtered Routes Button -->
        <button 
          @click="showFilteredRoutesModal = !showFilteredRoutesModal"
          class="filtered-routes-button"
          aria-label="Toggle filtered routes"
          type="button"
        >
          <font-awesome-icon :icon="['fas', 'list']" class="list-icon" />
        </button>
        
        <!-- Starred Crags Toggle Button -->
        <button 
          @click="showStarredCrags = !showStarredCrags"
          :class="['starred-crags-button', { active: showStarredCrags }]"
          aria-label="Toggle starred crags"
          type="button"
        >
          <font-awesome-icon :icon="['fas', 'star']" class="star-icon" />
        </button>
        
        <!-- Save Offline Button -->
        <button 
          @click="saveForOffline"
          class="save-offline-button"
          aria-label="Save for offline use"
          type="button"
        >
          <font-awesome-icon :icon="['fas', 'download']" class="download-icon" />
        </button>
      </div>
      
      <!-- Search input group (moved to right) -->
      <div class="search-input-group">
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
      </div>
      
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
      <div class="map-wrapper">
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
            <!-- Add a highlight gradient for the selected crag -->
            <radialGradient id="selectedCragGradient" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
              <stop offset="0%" stop-color="#FFD700" stop-opacity="1"/>
              <stop offset="100%" stop-color="#FFA500" stop-opacity="1"/>
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
            :showStarredCrags="showStarredCrags"
            @select-area="selectArea" 
            @hover="hoveredArea = $event"
            @select-crag="handleSelectCrag"
            :isCragSelected="isCragSelected" 
          />

          <!-- Debug point -->
          
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

    <!-- Reset zoom button positioned at bottom right -->
    <button 
      @click="resetZoom"
      class="reset-zoom-button"
      aria-label="Reset zoom to default"
      type="button"
    >
      <font-awesome-icon :icon="['fas', 'crosshairs']" />
    </button>

    <div v-if="shouldShowTooltip" class="fixed-tooltip" :class="{ 'with-modal': showFilteredRoutesModal }">
        <RouteTooltip
          :selected-crag="selectedCrag!"
          :crag-routes="cragRoutes"
          :filtered-out-routes="filteredOutRoutes"
          @close="hideTooltip"
        />
      </div>
      
      <!-- Filtered Routes Modal -->
      <FilteredRoutesModal
        :routes="routesData"
        :min-difficulty="minDifficulty"
        :max-difficulty="maxDifficulty"
        :is-visible="showFilteredRoutesModal"
        @close="showFilteredRoutesModal = false"
        @select-route="handleRouteSelection"
      />
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
  touch-action: pan-y; /* Allow vertical panning for page scrolling but prevent zoom */
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
  touch-action: none; /* Disable all default touch behaviors for map area */
}

.map-wrapper svg {
  width: 100%; /* Allow SVG to scale with the container */
  height: 100%;
  max-width: none; /* Remove any max-width constraints */
  min-width: 0; /* Remove min-width constraint */
  object-fit: cover; /* Cover available space */
  background-color: rgba(143, 136, 135, 0.106);
  cursor: default !important;
  touch-action: none; /* Ensure no default touch behaviors on SVG */
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
  bottom: 50px; 
  left: 50%;
  transform: translateX(-50%);
  width: 95%; /* Slightly wider */
  max-width: 450px; /* Increased from 400px */
  z-index: 90;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

/* Desktop-specific adjustments for the tooltip */
@media (min-width: 768px) {
  .fixed-tooltip {
    max-width: 550px; /* Larger tooltip on desktop */
    bottom: 70px; /* Position it higher on desktop */
  }
  
  /* Adjust tooltip position when modal is open */
  .fixed-tooltip.with-modal {
    left: 50%;
    right: auto;
    transform: translateX(calc(-50% + 200px)); /* Center in remaining space */
    max-width: min(calc(100vw - 440px), 500px); /* Limited width with screen bounds */
    width: 90%; /* Use most of available space */
    min-width: 280px; /* Ensure minimum readable width */
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
  display: flex;
  gap: 10px;
  align-items: center;
}

/* Desktop: Adjust search container when modal is open */
@media (min-width: 768px) {
  .search-container {
    transition: left 0.3s ease;
  }
  
  /* Add class to shift search bar when modal is open */
  .search-container.with-modal {
    left: 400px;
  }
}

.search-input-group {
  position: relative;
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 8px 40px 8px 12px; /* Add right padding for clear button */
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  color: white;
  border: none;
  background: rgba(255, 255, 255, 0.1);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

/* Clear search button styles - positioned within input group */
.clear-search-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
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
  transition: background-color 0.2s ease;
}

.clear-search-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.clear-search-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4);
}

.search-actions-group {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* Mobile responsive styles */
@media (max-width: 480px) {
  .search-container {
    padding: 8px;
    gap: 8px;
  }
  
  .search-input {
    font-size: 16px; /* Prevent zoom on iOS */
    padding: 10px 36px 10px 12px;
  }
  
  .clear-search-button {
    width: 28px;
    height: 28px;
    right: 6px;
  }
  
  .quick-nav-button,
  .filtered-routes-button,
  .starred-crags-button,
  .save-offline-button {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
  
  .search-actions-group {
    gap: 6px;
  }
}

/* Quick navigation button styles */
.quick-nav-button,
.filtered-routes-button,
.starred-crags-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  color: white;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}


.map-icon {
  display: inline-block;
  transform: translateY(-1px); /* Slight adjustment for visual alignment */
}


.list-icon {
  display: inline-block;
}

/* Action button hover and focus states */
.quick-nav-button:hover,
.filtered-routes-button:hover,
.starred-crags-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.quick-nav-button:focus,
.filtered-routes-button:focus,
.starred-crags-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4);
}

.starred-crags-button.active {
  background: rgba(255, 215, 0, 0.3);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.5);
}

.starred-crags-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4);
}

.star-icon {
  display: inline-block;
}

.download-icon {
  display: inline-block;
}

/* Save offline button specific styles */
.save-offline-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  color: white;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.save-offline-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.save-offline-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4);
}

.save-offline-button.saved {
  background: rgba(0, 255, 0, 0.3);
  color: #00ff00;
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

/* Reset zoom button styles */
.reset-zoom-button {
  position: fixed;
  bottom: 60px;
  right: 20px;
  background: rgba(91, 86, 86, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.2s ease;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.reset-zoom-button:hover {
  background: rgba(91, 86, 86, 1);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.reset-zoom-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
}

.reset-zoom-button:active {
  transform: scale(0.95);
}

/* Mobile responsive styles for reset button */
@media (max-width: 480px) {
  .reset-zoom-button {
    bottom: 80px; /* Position above difficulty filter on mobile */
    width: 44px;
    height: 44px;
    font-size: 18px;
  }
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