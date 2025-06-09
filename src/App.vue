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
import OfflineTooltips from '@/components/common/OfflineTooltips.vue';
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

// Cache state
const hasCachedContent = ref(false);
const cacheTimestamp = ref<string | null>(null);
const showCacheTooltip = ref(false);
const cachedVersion = ref<string | null>(null);
const isNewVersionAvailable = ref(false);
const isServiceWorkerRegistered = ref(false);
const isOnline = ref(navigator.onLine);
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

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
    console.log('Click ignored - pan/zooming with movement');
    return;
  }
  
  console.log('Pan/zoom check passed');
  
  // Check if this is a valid click (not a drag)
  const isValid = interactionHandler.isValidClick();
  console.log('isValidClick result:', isValid);
  
  if (!isValid) {
     console.log('Click ignored - invalid click, state:', {
      ...state,
      timeSinceDragEnd: timeSinceDrag
    });
    return;
  }
  
  console.log('Valid click detected, continuing...');
  
  // console.log('handleSelectCrag called for:', crag.name, crag.sector);
  
  // Get routes for this crag before proceeding
  const allRoutes = getRoutesByCrag(crag.name, crag.sector || '');
  // console.log('All routes count:', allRoutes.length);
  
  // Check if there are any routes before continuing
  if (allRoutes.length === 0) {
    console.log('No routes found for this crag, skipping tooltip');
    return;
  }
  
  console.log('Routes found:', allRoutes.length);
  
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
      console.log('No visible routes found for this crag with current filter, skipping tooltip');
      return;
    }
    
    console.log('Visible routes found:', visibleRoutes.length);
  }
  
  selectedCrag.value = crag;
  showTooltip.value = true;

  focusOn(crag, bypassFilter);
};

const hideTooltip = () => {
  showTooltip.value = false;
};

// Add debug reference for the center point
const viewBoxCenter = ref<{ x: number, y: number } | null>(null);

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

// Store event listener references for proper cleanup
const handleOnline = () => {
  isOnline.value = true;
};

const handleOffline = () => {
  isOnline.value = false;
};

onMounted(() => {
  // Add online/offline event listeners
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Check if service worker is already registered
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      if (registrations.length > 0) {
        isServiceWorkerRegistered.value = true;
        console.log('Service worker already registered');
      }
    });
  }
  
  // Check if cache was recently cleared
  const cacheCleared = localStorage.getItem('cache-cleared');
  if (cacheCleared) {
    console.log('Cache was recently cleared - staying online');
    localStorage.removeItem('cache-cleared');
    // Don't check for cached content, stay online
  } else {
    // Check for cached content on app load
    checkCachedContent();
  }
  
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
  
  // Remove online/offline event listeners
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  
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
const minDifficulty = ref(localStorage.getItem('minDifficulty') || '5C');
const maxDifficulty = ref(localStorage.getItem('maxDifficulty') || '8C+');

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

// Add quick navigation function (commented out for now)
// const quickNavigate = () => {
//   const selectedCragObj = selectedCrag.value;
//   if (selectedCragObj) {
//     panZoomInstance?.zoom(1, { animate: true });
//     focusOn(selectedCragObj);
//   }
// };

// Reset zoom to default values
const resetZoom = () => {
  if (!panZoomInstance) return;
  
  // Reset to initial position and scale from config
  panZoomInstance.zoom(zoomConfig.value.startScale, { animate: true });
  panZoomInstance.pan(50, -50, { animate: true });
};

// Double tap handling for mobile zoom
const handleDoubleTap = () => {
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


function focusOn(crag: SvgObject, bypassTooltipCheck = false, retryCount = 0) {
  const maxRetries = 10; // Maximum retry attempts
  
  // Skip focusing if there are no routes to show (unless bypassing for search/route selection)
  if (!bypassTooltipCheck && !shouldShowTooltip.value) {
    return;
  }

  const svg = mapSvg.value;
  const pz = panZoomInstance;
  
  // Add comprehensive initialization checks with retry limit
  if (!svg || !pz) {
    if (retryCount >= maxRetries) {
      console.error('focusOn failed after maximum retries: SVG or panzoom instance not ready');
      return;
    }
    console.warn(`focusOn attempt ${retryCount + 1}: SVG or panzoom instance not ready, retrying...`, {
      svg: !!svg,
      pz: !!pz
    });
    setTimeout(() => focusOn(crag, bypassTooltipCheck, retryCount + 1), 100);
    return;
  }
  
  // Ensure parent element is available
  if (!svg.parentElement) {
    if (retryCount >= maxRetries) {
      console.error('focusOn failed after maximum retries: SVG parent element not ready');
      return;
    }
    console.warn(`focusOn attempt ${retryCount + 1}: SVG parent element not ready, retrying...`);
    setTimeout(() => focusOn(crag, bypassTooltipCheck, retryCount + 1), 100);
    return;
  }

  // Detect mobile Firefox or Samsung Browser
  const isFirefox = navigator.userAgent.includes('Firefox');
  const isSamsungBrowser = navigator.userAgent.includes('SamsungBrowser');
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isMobileFirefox = (isFirefox || isSamsungBrowser) && isMobile;

  /* 1. Find the target element - use area for mobile Firefox, crag otherwise */
  let el: SVGGraphicsElement | null = null;
  
  if (isMobileFirefox) {
    // Focus on the area instead of the crag for mobile Firefox
    const area = areas.find(area => area.name === crag.sector);
    if (area) {
      el = svg.getElementById(area.name) as SVGGraphicsElement | null;
    }
  }
  
  // Fallback to crag if area not found or not mobile Firefox
  if (!el) {
    el = svg.getElementById(crag.name + '_' + crag.sector) as SVGGraphicsElement | null;
  }
  
  // Check if target element exists with retry mechanism
  if (!el) {
    if (retryCount >= maxRetries) {
      console.error(`focusOn failed after maximum retries: Target element not found for crag ${crag.name}_${crag.sector}`);
      return;
    }
    console.warn(`focusOn attempt ${retryCount + 1}: Target element not found for crag ${crag.name}_${crag.sector}, retrying...`);
    setTimeout(() => focusOn(crag, bypassTooltipCheck, retryCount + 1), 100);
    return;
  }

  /* 2. Mark as programmatic movement to prevent tooltip hiding */
  isProgrammaticMove.value = true;

  /* 3. Reset to scale 1 first for accurate calculations */
  if (!isMobileFirefox) {
    pz.zoom(1, { animate: false });
  }
  
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
  
  if (isMobileFirefox) {
    // For mobile Firefox/Samsung Browser, try panzoom's focal point method
    console.log('Mobile Firefox detected - using focal point approach');
    
    // Try using panzoom's zoomToPoint which handles coordinates internally
    const currentScale = pz.getScale();
    console.log('Current scale:', currentScale);
    
    // Reset to a known state first
    pz.zoom(1, { animate: false });
    
    // Get element's current screen position
    const elRect = el.getBoundingClientRect();
    const elCenterScreenX = elRect.left + elRect.width / 2;
    const elCenterScreenY = elRect.top + elRect.height / 2;
    
    // Use the element's current screen position as the focal point
    const focalPoint = {
      clientX: elCenterScreenX,
      clientY: elCenterScreenY
    };
    
    console.log('Element screen center:', elCenterScreenX, elCenterScreenY);
    console.log('Focal point:', focalPoint);
    
    // Use zoomToPoint to properly handle the coordinate transformation
    pz.zoomToPoint(zoomConfig.value.startScale, focalPoint, { animate: true });
    
    // Skip the manual pan calculation, zoomToPoint handles it
    return;
  } else if (isFirefox) {
    // Firefox-specific calculation using SVG viewBox scaling
    const viewBox = svg.viewBox.baseVal;
    const scaleX = parent.clientWidth / viewBox.width;
    const scaleY = parent.clientHeight / viewBox.height;
    
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
  
  // For mobile Firefox: set default zoom, for others: zoom in
  if (isMobileFirefox) {
    pz.zoom(zoomConfig.value.startScale, { animate: true });
  } else {
    pz.zoom(panZoomScale.value, { animate: true });
  }
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

// Register service worker manually
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && !isServiceWorkerRegistered.value) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration);
      isServiceWorkerRegistered.value = true;
      return registration;
    } catch (error) {
      console.error('SW registration failed:', error);
      throw error;
    }
  }
  return null;
};

// Check for cached content and version
const checkCachedContent = async () => {
  if ('caches' in window) {
    try {
      const cache = await caches.open('magic-wood-v2');
      
      // Check if we have cached timestamp
      const timestampResponse = await cache.match('CACHE_TIMESTAMP');
      if (timestampResponse) {
        cacheTimestamp.value = await timestampResponse.text();
        hasCachedContent.value = true;
      }
      
      // Check cached version
      const versionResponse = await cache.match('APP_VERSION');
      if (versionResponse) {
        cachedVersion.value = await versionResponse.text();
        console.log('Found cached version:', cachedVersion.value);
      }
      
      // Check if new version is available by trying to fetch latest version
      await checkForNewVersion();
      
      // Fallback: check if any resources are cached
      const cachedUrls = await cache.keys();
      if (cachedUrls.length > 0) {
        hasCachedContent.value = true;
        console.log('Found cached resources:', cachedUrls.length);
      }
      
      // Don't auto-show tooltip on page load anymore
      // Tooltip will only show when user clicks the button
      
    } catch (error) {
      console.warn('Failed to check cached content:', error);
    }
  }
};

// Check for new version availability
const checkForNewVersion = async () => {
  if (!navigator.onLine) {
    console.log('Offline - cannot check for new version');
    return;
  }
  
  try {
    // Try to fetch the service worker to get the latest version
    const response = await fetch('/sw.js', { cache: 'no-cache' });
    if (response.ok) {
      const swContent = await response.text();
      const versionMatch = swContent.match(/const VERSION = ['"`]([^'"`]+)['"`]/);
      if (versionMatch && versionMatch[1]) {
        const latestVersion = versionMatch[1];
        if (cachedVersion.value && cachedVersion.value !== latestVersion) {
          isNewVersionAvailable.value = true;
          console.log('New version available:', latestVersion, 'vs cached:', cachedVersion.value);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to check for new version:', error);
  }
};

// Clear all cache
const clearAllCache = async () => {
  try {
    if ('caches' in window) {
      // Set flag to prevent automatic re-caching
      localStorage.setItem('cache-cleared', 'true');
      
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      console.log('All caches cleared');
      
      // Also unregister service worker to ensure clean state
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
        console.log('Service workers unregistered');
      }
      
      // Reset state
      hasCachedContent.value = false;
      cacheTimestamp.value = null;
      cachedVersion.value = null;
      isNewVersionAvailable.value = false;
      showCacheTooltip.value = false;
      
      // Show success notification
      showCacheClearNotification();
      
      // Hard reload to bypass all caches after a brief delay
      setTimeout(() => {
        window.location.reload(); // Reload to get fresh content
      }, 1500);
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
    showCacheUpdateError();
  }
};

// Format cache date for display
const formatCacheDate = (timestamp: string | null) => {
  if (!timestamp) return 'Unknown date';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    return 'Recently cached';
  }
};

// Handle button click - different behavior for cached/uncached states
const handleButtonClick = () => {
  if (hasCachedContent.value) {
    // If there's cached content, show tooltip with options
    showCacheTooltip.value = !showCacheTooltip.value;
  } else {
    // No cached content - save immediately
    saveForOffline();
  }
};

// Reload to get latest version
const reloadForLatest = () => {
  console.log('Reloading to get latest version');
  window.location.reload();
};

// Save for offline functionality or reload
const saveForOffline = async () => {
  console.log('Save/reload button clicked');
  
  // If we already have cached content, reload the page
  if (hasCachedContent.value) {
    console.log('Reloading page to get latest version');
    window.location.reload();
    return;
  }
  
  if (!('serviceWorker' in navigator)) {
    console.error('Service worker not supported');
    showCacheUpdateError();
    return;
  }
  
  if (!('caches' in window)) {
    console.error('Cache API not supported');
    showCacheUpdateError();
    return;
  }
  
  // Register service worker first if not already registered
  try {
    await registerServiceWorker();
  } catch (error) {
    console.error('Failed to register service worker:', error);
    showCacheUpdateError();
    return;
  }
  
  try {
    console.log('Starting save offline process...');
    
    // Open cache
    console.log('Opening cache: magic-wood-v2');
    const cache = await caches.open('magic-wood-v2');
    console.log('Cache opened successfully');
    
    // Get current URL info
    const currentUrl = window.location.href;
    const currentPathname = window.location.pathname;
    console.log('Current URL:', currentUrl);
    console.log('Current pathname:', currentPathname);
    
    // Cache resources individually to avoid duplicates
    const staticResources = [
      '/favicon.ico',
      '/magic-wood.png'
    ];
    
    // Determine the correct page URL to cache
    const currentPage = window.location.pathname === '/' ? '/' : '/index.html';
    
    // Build the final list and ensure no duplicates
    const resourcesToCache = [currentPage, ...staticResources];
    const uniqueResources = [...new Set(resourcesToCache)];
    
    console.log('Current page:', currentPage);
    console.log('Resources to cache:', resourcesToCache);
    console.log('Unique resources after deduplication:', uniqueResources);
    
    for (const resource of uniqueResources) {
      try {
        console.log(`Caching resource: ${resource}`);
        await cache.add(resource);
        console.log(`Successfully cached: ${resource}`);
      } catch (error) {
        console.warn(`Failed to cache ${resource}:`, error);
        // Continue with other resources
      }
    }
    
    // Store timestamp and version
    console.log('Storing timestamp and version...');
    const timestamp = new Date().toISOString();
    const timestampResponse = new Response(timestamp, {
      headers: { 'Content-Type': 'text/plain' }
    });
    await cache.put('CACHE_TIMESTAMP', timestampResponse);
    
    // Get and store current version from service worker
    try {
      const swResponse = await fetch('/sw.js', { cache: 'no-cache' });
      const swContent = await swResponse.text();
      const versionMatch = swContent.match(/const VERSION = ['"`]([^'"`]+)['"`]/);
      if (versionMatch && versionMatch[1]) {
        const currentVersion = versionMatch[1];
        const versionResponse = new Response(currentVersion, {
          headers: { 'Content-Type': 'text/plain' }
        });
        await cache.put('APP_VERSION', versionResponse);
        cachedVersion.value = currentVersion;
        console.log('Version stored successfully:', currentVersion);
      }
    } catch (error) {
      console.warn('Failed to store version:', error);
    }
    
    console.log('Timestamp stored successfully:', timestamp);
    
    // Update cache state
    cacheTimestamp.value = timestamp;
    hasCachedContent.value = true;
    isNewVersionAvailable.value = false; // Reset since we just cached the latest
    
    // Show user feedback with timestamp
    console.log('Showing success feedback');
    const button = document.querySelector('.save-offline-button');
    if (button) {
      const originalContent = button.innerHTML;
      button.innerHTML = '<font-awesome-icon icon="check" class="check-icon" />';
      button.classList.add('saved');
      
      // Show additional feedback
      showCacheUpdateNotification(timestamp);
      
      setTimeout(() => {
        button.innerHTML = originalContent;
        button.classList.remove('saved');
      }, 2000);
    }
    
  } catch (error) {
    console.error('Failed to save for offline - detailed error:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    showCacheUpdateError();
  }
};

// Show cache update notification
const showCacheUpdateNotification = (timestamp: string) => {
  const notification = document.createElement('div');
  notification.className = 'cache-notification';
  notification.innerHTML = `
    <div class="cache-notification-content">
      <strong>Saved for offline!</strong><br>
      <small>Cached at ${new Date(timestamp).toLocaleString()}</small>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
};

// Show cache clear notification
const showCacheClearNotification = () => {
  const notification = document.createElement('div');
  notification.className = 'cache-notification clear-success';
  notification.innerHTML = `
    <div class="cache-notification-content">
      <strong>Cache cleared!</strong><br>
      <small>Now using online version</small>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 4000);
};

// Show cache update error
const showCacheUpdateError = () => {
  const notification = document.createElement('div');
  notification.className = 'cache-notification error';
  notification.innerHTML = `
    <div class="cache-notification-content">
      <strong>Failed to save offline</strong><br>
      <small>Please try again</small>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
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
      
      <!-- Save Offline / Reload Button (moved to right after search) -->
      <div class="save-button-container">
        <button 
          @click="handleButtonClick"
          :class="['save-offline-button', { 'has-cache': hasCachedContent, 'has-new-version': isNewVersionAvailable }]"
          :aria-label="hasCachedContent ? 'Show cache options' : 'Save for offline use'"
          type="button"
        >
          <font-awesome-icon 
            :icon="hasCachedContent ? ['fas', 'rotate-right'] : ['fas', 'download']" 
            :class="hasCachedContent ? 'reload-icon' : 'download-icon'" 
          />
        </button>
        
        <!-- NEW indicator when new version is available -->
        <div v-if="isNewVersionAvailable" class="new-version-badge">NEW</div>
        
        <!-- Cache Tooltip - Only visible when cache exists -->
        <div 
          v-if="showCacheTooltip && hasCachedContent" 
          class="cache-tooltip"
          :class="{ 'mobile-persistent': isMobile }"
        >
          <div class="cache-tooltip-content">
            <div class="cache-header">
              <strong>
                Using offline version
                <span v-if="isNewVersionAvailable" class="new-badge">NEW AVAILABLE</span>
              </strong>
              <button 
                @click="showCacheTooltip = false"
                class="cache-close-btn"
                aria-label="Close cache info"
              >×</button>
            </div>
            
            <div class="cache-version" v-if="cachedVersion">
              Version: {{ cachedVersion }}
            </div>
            
            <div class="cache-date">Cached {{ formatCacheDate(cacheTimestamp) }}</div>
            
            <div class="cache-hint">
              {{ isNewVersionAvailable 
                ? 'New version available - click clear and load new version' 
                : 'Choose an action below' 
              }}
            </div>
            
            <div class="cache-actions">
              <button 
                @click="reloadForLatest"
                class="reload-cache-btn"
                :disabled="!isOnline"
                type="button"
              >
                Reload
              </button>
              <button 
                @click="clearAllCache"
                class="clear-cache-btn"
                :disabled="!isOnline"
                type="button"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
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
      
      <!-- Offline Tooltips -->
      <OfflineTooltips />
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
  bottom: 120px; 
  left: 50%;
  transform: translateX(-50%);
  width: 95%; /* Slightly wider */
  max-width: 450px; /* Increased from 400px */
  z-index: 90;
  margin-bottom: 10px;
  transition: all 0.3s ease;
}

/* Desktop-specific adjustments for the tooltip */
@media (min-width: 768px) {
  .fixed-tooltip {
    max-width: 550px; /* Larger tooltip on desktop */
    bottom: 130px; /* Position it higher on desktop */
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

.download-icon, .reload-icon {
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
  color: #00ff0083;
}

.save-offline-button.has-cache {
  background: rgba(7, 255, 40, 0.128);
  color: #f3f8f3;
  border: 1px solid rgba(40, 255, 7, 0.2);
}

.save-offline-button.has-cache:hover {
  background: rgba(98, 255, 7, 0.2);
  color: #f3f8f3;
}

.save-offline-button.has-new-version {
  background: rgba(255, 87, 51, 0.4);
  color: #ff5733;
  border: 1px solid rgba(255, 87, 51, 0.6);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 87, 51, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(255, 87, 51, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 87, 51, 0); }
}

/* Save button container for positioning NEW badge */
.save-button-container {
  position: relative;
  display: inline-block;
}

/* NEW version badge */
.new-version-badge {
  position: absolute;
  top: -4px;
  right: -6px;
  background: #ff5733;
  color: white;
  font-size: 8px;
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 4px;
  line-height: 1;
  pointer-events: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Cache tooltip styles */
.cache-tooltip {
  position: fixed;
  top: 65px;
  right: 20px;
  background: rgba(91, 86, 86, 0.95);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 250;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 280px;
  pointer-events: auto;
}

.cache-tooltip-content {
  font-size: 13px;
  line-height: 1.4;
}

.cache-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.cache-tooltip-content strong {
  color: #ffc107;
  margin: 0;
}

.cache-close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  margin-left: 8px;
}

.cache-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.cache-version {
  color: #ccc;
  font-size: 11px;
  margin-bottom: 4px;
  font-weight: 500;
}

.new-badge {
  background: #ff5733;
  color: white;
  font-size: 9px;
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 6px;
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.5; }
}

.cache-actions {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 8px;
}

.reload-cache-btn {
  background: rgba(33, 150, 243, 0.2);
  border: 1px solid rgba(33, 150, 243, 0.4);
  color: white;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}

.reload-cache-btn:hover {
  background: rgba(33, 150, 243, 0.3);
  border-color: rgba(33, 150, 243, 0.6);
}

.reload-cache-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
}

.reload-cache-btn:disabled {
  background: rgba(128, 128, 128, 0.2);
  border-color: rgba(128, 128, 128, 0.4);
  color: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
  opacity: 0.6;
}

.reload-cache-btn:disabled:hover {
  background: rgba(128, 128, 128, 0.2);
  border-color: rgba(128, 128, 128, 0.4);
}

.clear-cache-btn {
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.4);
  color: white;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}

.clear-cache-btn:hover {
  background: rgba(244, 67, 54, 0.3);
  border-color: rgba(244, 67, 54, 0.6);
}

.clear-cache-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(244, 67, 54, 0.3);
}

.clear-cache-btn:disabled {
  background: rgba(128, 128, 128, 0.2);
  border-color: rgba(128, 128, 128, 0.4);
  color: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
  opacity: 0.6;
}

.clear-cache-btn:disabled:hover {
  background: rgba(128, 128, 128, 0.2);
  border-color: rgba(128, 128, 128, 0.4);
}

.cache-date {
  color: #ccc;
  font-size: 12px;
  margin-bottom: 4px;
}

.cache-hint {
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
  font-style: italic;
}

.cache-info {
  color: #ccc;
  font-size: 11px;
  margin-top: 4px;
  line-height: 1.3;
}

/* Mobile persistent tooltip */
.cache-tooltip.mobile-persistent {
  position: fixed;
  top: 60px;
  left: 10px;
  right: 10px;
  max-width: none;
  animation: slideInFromTop 0.3s ease-out;
  z-index: 200;
  pointer-events: auto;
}

@media (max-width: 480px) {
  .cache-tooltip:not(.mobile-persistent) {
    top: 60px;
    left: 10px;
    right: 10px;
    max-width: none;
  }
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
  bottom: 130px;
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
  z-index: 105;
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
    bottom: 140px; /* Position above difficulty filter on mobile */
    width: 44px;
    height: 44px;
    font-size: 18px;
  }
}

/* Cache notification styles */
:global(.cache-notification) {
  position: fixed;
  top: 65px;
  right: 10px;
  background: rgba(91, 86, 86, 0.95);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 300;
  backdrop-filter: blur(10px);
  transform: translateX(100%);
  opacity: 0;
  transition: all 0.3s ease;
  max-width: 280px;
}

:global(.cache-notification.error) {
  background: rgba(91, 86, 86, 0.95);
}

:global(.cache-notification.clear-success) {
  background: rgba(91, 86, 86, 0.95);
}

:global(.cache-notification.show) {
  transform: translateX(0);
  opacity: 1;
}

:global(.cache-notification-content) {
  font-size: 14px;
  line-height: 1.4;
}

:global(.cache-notification-content strong) {
  display: block;
  margin-bottom: 4px;
}

:global(.cache-notification-content small) {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}

@media (max-width: 480px) {
  :global(.cache-notification) {
    top: 80px;
    left: 10px;
    right: 10px;
    max-width: none;
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

/* PWA Status Bar Styling for Standalone Mode */
@media (display-mode: standalone) {
  body {
    /* Add padding for status bar on iOS in standalone mode */
    padding-top: env(safe-area-inset-top);
  }
  
  .app-container {
    /* Ensure app container accounts for status bar */
    padding-top: env(safe-area-inset-top);
  }
  
  /* Status bar background overlay for iOS */
  .app-container::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: env(safe-area-inset-top);
    background-color: rgba(91, 86, 86, 0.9);
    z-index: 9999;
    pointer-events: none;
  }
}
</style>