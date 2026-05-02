// Drag functionality with rAF-based smooth movement, touch support, and proper cleanup

let draggedElement = null;
let dragCleanup = null;

export function makeDraggable(element, handle) {
  handle.style.cursor = 'move';
  handle.style.touchAction = 'none'; // Prevent scroll interference
  
  handle.addEventListener('mousedown', startDrag);
  handle.addEventListener('touchstart', startDragTouch, { passive: false });
  
  function startDrag(e) {
    e.preventDefault();
    initiateDrag(e.clientX, e.clientY);
  }
  
  function startDragTouch(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return; // Only single-finger drag
    const touch = e.touches[0];
    initiateDrag(touch.clientX, touch.clientY);
    
    // Use touch events for move/up
    const onTouchMove = (e) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => {
      onEnd();
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
    
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
  }
  
  function initiateDrag(clientX, clientY) {
    if (element.dataset.minimized === 'true') return;
    
    draggedElement = element;
    const startLeft = element.offsetLeft;
    const startTop = element.offsetTop;
    let lastX = clientX;
    let lastY = clientY;
    let currentDx = 0;
    let currentDy = 0;
    let rafId = null;
    
    function applyMovement() {
      element.style.left = (startLeft + currentDx) + 'px';
      element.style.top = (startTop + currentDy) + 'px';
      rafId = null;
    }
    
    // These are set up by the caller (mouse or touch)
    // onMove sets the delta and schedules rAF
    function onMove(clientX, clientY) {
      currentDx += clientX - lastX;
      currentDy += clientY - lastY;
      lastX = clientX;
      lastY = clientY;
      if (!rafId) {
        rafId = requestAnimationFrame(applyMovement);
      }
    }
    
    function onEnd() {
      if (rafId) cancelAnimationFrame(rafId);
      // Apply final position synchronously
      element.style.left = (startLeft + currentDx) + 'px';
      element.style.top = (startTop + currentDy) + 'px';
      draggedElement = null;
      import('./storage.js').then(({ debouncedSave }) => debouncedSave());
    }
    
    // ── Mouse event handlers ──
    function onMouseMove(e) {
      e.preventDefault();
      onMove(e.clientX, e.clientY);
    }
    function onMouseUp() {
      onEnd();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Store cleanup for emergency
    dragCleanup = () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }
}

export function initDragCleanup() {
  // Clean up stray drag listeners on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dragCleanup) {
      dragCleanup();
      dragCleanup = null;
    }
  });
}
