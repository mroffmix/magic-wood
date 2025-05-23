/**
 * Utility for handling interaction gestures and distinguishing between
 * drag/pan gestures and genuine click/tap events.
 */

export interface PointerPosition {
  x: number;
  y: number;
}

export interface InteractionState {
  isPointerDown: boolean;
  startPosition: PointerPosition | null;
  isDragging: boolean;
  dragThreshold: number;
  lastDragEndTime: number;
}

/**
 * Create an interaction handler that can distinguish between drag and click events
 * @param dragThreshold - Minimum pixel distance to consider a gesture as drag (default: 8px)
 * @returns Object with methods to track and evaluate pointer interactions
 */
export function createInteractionHandler(dragThreshold: number = 8) {
  const state: InteractionState = {
    isPointerDown: false,
    startPosition: null,
    isDragging: false,
    dragThreshold,
    lastDragEndTime: 0
  };

  /**
   * Get pointer position from mouse or touch event
   */
  function getPointerPosition(event: MouseEvent | TouchEvent): PointerPosition {
    if (event instanceof MouseEvent) {
      return { x: event.clientX, y: event.clientY };
    } else if (event instanceof TouchEvent && event.touches.length > 0) {
      const touch = event.touches[0];
      return { x: touch.clientX, y: touch.clientY };
    } else if (event instanceof TouchEvent && event.changedTouches.length > 0) {
      // For touchend events
      const touch = event.changedTouches[0];
      return { x: touch.clientX, y: touch.clientY };
    }
    return { x: 0, y: 0 };
  }

  /**
   * Calculate distance between two points
   */
  function getDistance(pos1: PointerPosition, pos2: PointerPosition): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Handle pointer down event (mouse down or touch start)
   */
  function handlePointerDown(event: Event): void {
    if (event instanceof MouseEvent || event instanceof TouchEvent) {
      state.isPointerDown = true;
      state.startPosition = getPointerPosition(event);
      state.isDragging = false;
    }
  }

  /**
   * Handle pointer move event (mouse move or touch move)
   */
  function handlePointerMove(event: Event): void {
    if (!state.isPointerDown || !state.startPosition) return;

    if (event instanceof MouseEvent || event instanceof TouchEvent) {
      const currentPosition = getPointerPosition(event);
      const distance = getDistance(state.startPosition, currentPosition);

      if (distance > state.dragThreshold) {
        state.isDragging = true;
      }
    }
  }

  /**
   * Handle pointer up event (mouse up or touch end)
   */
  function handlePointerUp(_event: Event): void {
    const wasDragging = state.isDragging;
    
    state.isPointerDown = false;
    state.startPosition = null;
    state.isDragging = false;
    
    // If we were dragging, record the time so we can prevent clicks for a short period
    if (wasDragging) {
      state.lastDragEndTime = Date.now();
    }
  }

  /**
   * Check if the current gesture should be considered a valid click
   * (i.e., not a drag)
   */
  function isValidClick(): boolean {
    // If currently dragging, definitely not a valid click
    if (state.isDragging) {
      return false;
    }
    
    // If a drag just ended recently (within 200ms), don't allow clicks
    // This prevents clicks that fire immediately after drag ends
    const timeSinceDragEnd = Date.now() - state.lastDragEndTime;
    if (state.lastDragEndTime > 0 && timeSinceDragEnd < 200) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if currently dragging
   */
  function isDragging(): boolean {
    return state.isDragging;
  }

  /**
   * Reset the interaction state
   */
  function reset(): void {
    state.isPointerDown = false;
    state.startPosition = null;
    state.isDragging = false;
    state.lastDragEndTime = 0;
  }

  /**
   * Get current state (for debugging)
   */
  function getState(): Readonly<InteractionState> {
    return { ...state };
  }

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isValidClick,
    isDragging,
    reset,
    getState
  };
}

/**
 * Composable for Vue components to use interaction handling
 */
export function useInteractionHandler(dragThreshold?: number) {
  const handler = createInteractionHandler(dragThreshold);

  /**
   * Handle click events to prevent them during/after drags
   */
  function handleClick(event: Event): void {
    const state = handler.getState();
    const timeSinceDrag = state.lastDragEndTime > 0 ? Date.now() - state.lastDragEndTime : 'N/A';
    
    console.log('Click event intercepted, state:', {
      ...state,
      timeSinceDragEnd: timeSinceDrag,
      target: event.target,
      eventType: event.type
    });
    
    if (!handler.isValidClick()) {
      console.log('Preventing click event - was dragging, target:', event.target);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    } else {
      console.log('Allowing click event - valid click, target:', event.target);
    }
  }

  /**
   * Setup event listeners on an element
   */
  function setupEventListeners(element: HTMLElement | SVGElement) {
    // Mouse events
    element.addEventListener('mousedown', handler.handlePointerDown);
    element.addEventListener('mousemove', handler.handlePointerMove);
    element.addEventListener('mouseup', handler.handlePointerUp);
    
    // Touch events
    element.addEventListener('touchstart', handler.handlePointerDown, { passive: true });
    element.addEventListener('touchmove', handler.handlePointerMove, { passive: true });
    element.addEventListener('touchend', handler.handlePointerUp, { passive: true });

    // Prevent click events during/after drags
    element.addEventListener('click', handleClick, { capture: true });

    // Handle mouse leave to reset state
    element.addEventListener('mouseleave', handler.reset);
  }

  /**
   * Remove event listeners from an element
   */
  function removeEventListeners(element: HTMLElement | SVGElement) {
    element.removeEventListener('mousedown', handler.handlePointerDown);
    element.removeEventListener('mousemove', handler.handlePointerMove);
    element.removeEventListener('mouseup', handler.handlePointerUp);
    element.removeEventListener('touchstart', handler.handlePointerDown);
    element.removeEventListener('touchmove', handler.handlePointerMove);
    element.removeEventListener('touchend', handler.handlePointerUp);
    element.removeEventListener('click', handleClick, { capture: true });
    element.removeEventListener('mouseleave', handler.reset);
  }

  return {
    ...handler,
    setupEventListeners,
    removeEventListeners
  };
}