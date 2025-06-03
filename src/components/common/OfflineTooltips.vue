<template>
  <!-- New Version Available Tooltip -->
  <div 
    v-if="showNewVersionTooltip && !isOnline" 
    class="offline-tooltip new-version-tooltip"
  >
    <div class="tooltip-header">
      <font-awesome-icon :icon="['fas', 'info-circle']" class="info-icon" />
      <span>Using Cached Version</span>
      <button @click="dismissNewVersionTooltip" class="close-btn">×</button>
    </div>
    <div class="tooltip-content">
      <p>You're viewing a cached version from {{ formatCacheDate(cacheTimestamp) }}</p>
      <p class="reload-hint">Connect to internet and reload to get the latest version</p>
    </div>
  </div>

  <!-- Add to Home Screen Tooltip -->
  <div 
    v-if="showAddToHomeTooltip && isMobile && !isPWAInstalled" 
    class="offline-tooltip add-to-home-tooltip"
  >
    <div class="tooltip-header">
      <font-awesome-icon :icon="['fas', 'mobile-alt']" class="mobile-icon" />
      <span>Install for Offline Use</span>
      <button @click="dismissAddToHomeTooltip" class="close-btn">×</button>
    </div>
    <div class="tooltip-content">
      <p>For better offline experience:</p>
      <div class="instructions">
        <div v-if="isIOS" class="ios-instructions">
          <p>📱 Tap <font-awesome-icon :icon="['fas', 'share']" /> Share button</p>
          <p>📋 Select "Add to Home Screen"</p>
        </div>
        <div v-else class="android-instructions">
          <p>📱 Tap browser menu (⋮)</p>
          <p>📋 Select "Add to Home screen" or "Install app"</p>
        </div>
      </div>
      <p class="cache-info">Cached: {{ formatCacheDate(cacheTimestamp) }}</p>
    </div>
  </div>

  <!-- Offline Status Indicator -->
  <div 
    v-if="!isOnline" 
    class="offline-indicator"
  >
    <font-awesome-icon :icon="['fas', 'wifi']" class="offline-icon" />
    <span>Offline</span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

// Props
interface Props {
  showNewVersionNotification?: boolean;
  showAddToHomeHint?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showNewVersionNotification: true,
  showAddToHomeHint: true
});

// Reactive state
const isOnline = ref(navigator.onLine);
const showNewVersionTooltip = ref(false);
const showAddToHomeTooltip = ref(false);
const cacheTimestamp = ref<string | null>(null);
const isPWAInstalled = ref(false);

// Device detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// Check if PWA is installed
const checkPWAInstallation = () => {
  // Check if app is running in standalone mode (added to home screen)
  isPWAInstalled.value = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
};

// Format cache date
const formatCacheDate = (timestamp: string | null) => {
  if (!timestamp) return 'Unknown';
  
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
    return 'Recently';
  }
};

// Get cache timestamp directly from cache
const getCacheTimestamp = async () => {
  if ('caches' in window) {
    try {
      const cache = await caches.open('magic-wood-v2');
      const response = await cache.match('CACHE_TIMESTAMP');
      if (response) {
        return await response.text();
      }
    } catch (error) {
      console.error('Failed to get cache timestamp:', error);
    }
  }
  return null;
};

// Show tooltips based on conditions
const checkAndShowTooltips = async () => {
  // Get cache timestamp
  cacheTimestamp.value = await getCacheTimestamp();
  
  // Show new version tooltip only when offline and cache exists
  if (!isOnline.value && cacheTimestamp.value && props.showNewVersionNotification) {
    const lastDismissed = localStorage.getItem('newVersionTooltipDismissed');
    if (!lastDismissed || Date.now() - parseInt(lastDismissed) > 24 * 60 * 60 * 1000) { // Show again after 24 hours
      showNewVersionTooltip.value = true;
    }
  }
  
  // Show add to home screen tooltip for mobile users
  if (isMobile && !isPWAInstalled.value && cacheTimestamp.value && props.showAddToHomeHint) {
    const lastDismissed = localStorage.getItem('addToHomeTooltipDismissed');
    if (!lastDismissed || Date.now() - parseInt(lastDismissed) > 7 * 24 * 60 * 60 * 1000) { // Show again after 7 days
      setTimeout(() => {
        showAddToHomeTooltip.value = true;
      }, 3000); // Show after 3 seconds delay
    }
  }
};

// Dismiss tooltips
const dismissNewVersionTooltip = () => {
  showNewVersionTooltip.value = false;
  localStorage.setItem('newVersionTooltipDismissed', Date.now().toString());
};

const dismissAddToHomeTooltip = () => {
  showAddToHomeTooltip.value = false;
  localStorage.setItem('addToHomeTooltipDismissed', Date.now().toString());
};

// Network status handlers
const handleOnline = () => {
  isOnline.value = true;
  showNewVersionTooltip.value = false; // Hide when back online
};

const handleOffline = () => {
  isOnline.value = false;
  setTimeout(checkAndShowTooltips, 1000); // Check after 1 second when going offline
};

onMounted(() => {
  // Check PWA installation status
  checkPWAInstallation();
  
  // Add network status listeners
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Initial check
  checkAndShowTooltips();
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
});
</script>

<style scoped>
.offline-tooltip {
  position: fixed;
  top: 80px;
  right: 20px;
  max-width: 320px;
  background: rgba(91, 86, 86, 0.95);
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 200;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 8px;
  font-weight: 500;
  font-size: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tooltip-content {
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.4;
}

.tooltip-content p {
  margin: 0 0 8px 0;
}

.tooltip-content p:last-child {
  margin-bottom: 0;
}

.close-btn {
  margin-left: auto;
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
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.info-icon, .mobile-icon {
  color: #4CAF50;
}

.reload-hint {
  color: #ffeb3b !important;
  font-size: 12px !important;
}

.instructions {
  margin: 8px 0;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.instructions p {
  margin: 4px 0;
  font-size: 12px;
}

.cache-info {
  color: #ccc !important;
  font-size: 11px !important;
  font-style: italic;
}

.offline-indicator {
  position: fixed;
  top: 65px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 152, 0, 0.6);
  color: white;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 150;
  backdrop-filter: blur(5px);
}

.offline-icon {
  opacity: 0.8;
}

/* Mobile responsive */
@media (max-width: 480px) {
  .offline-tooltip {
    top: 70px;
    left: 10px;
    right: 10px;
    max-width: none;
  }
  
  .tooltip-content {
    font-size: 12px;
  }
  
  .instructions p {
    font-size: 11px;
  }
}

/* Animation */
.offline-tooltip {
  animation: slideInFromRight 0.3s ease-out;
}

@keyframes slideInFromRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.offline-indicator {
  animation: slideInFromTop 0.3s ease-out;
}

@keyframes slideInFromTop {
  from {
    transform: translate(-50%, -100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}
</style>