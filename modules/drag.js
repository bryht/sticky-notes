// Drag functionality with rAF-based smooth movement, touch support, and proper cleanup

let _draggedElement = null;
let dragCleanup = null;

export function makeDraggable(element, handle) {
  handle.style.cursor = 'move';
  handle.style.touchAction = 'none'; // Prevent scroll interference
  
  handle.addEventListener('mousedown', startDrag);
  handle.addEventListener('touchstart', startDragTouch, { passive: false });
  
  function startDrag(e) {
    e.preventDefault();
    initiateDrag(e.clientX, e.clientY, 'mouse');
    // cleanup is handled by onMouseUp inside initiateDrag
  }
  
  function startDragTouch(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return; // Only single-finger drag
    const touch = e.touches[0];
    // Use touch-only move/end handlers — don't add mouse listeners
    // to avoid double-firing on hybrid devices (Surface, etc.)
    const dragState = initiateDrag(touch.clientX, touch.clientY, 'touch');
    
    const onTouchMove = (e) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      dragState.onMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => {
      dragState.onEnd();
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
    
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
  }
  
  function initiateDrag(clientX, clientY, inputType) {
    if (element.dataset.minimized === 'true') return;
    
    _draggedElement = element;
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
    
    function onMove(x, y) {
      currentDx += x - lastX;
      currentDy += y - lastY;
      lastX = x;
      lastY = y;
      if (!rafId) {
        rafId = requestAnimationFrame(applyMovement);
      }
    }
    
    function onEnd() {
      if (rafId) cancelAnimationFrame(rafId);
      element.style.left = (startLeft + currentDx) + 'px';
      element.style.top = (startTop + currentDy) + 'px';
      _draggedElement = null;
      import('./storage.js').then(({ debouncedSave }) => debouncedSave());
    }
    
    // Mouse-only event handlers
    if (inputType === 'mouse') {
      const onMouseMove = (e) => {
        e.preventDefault();
        onMove(e.clientX, e.clientY);
      };
      const onMouseUp = () => {
        onEnd();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      
      dragCleanup = () => {
        if (rafId) cancelAnimationFrame(rafId);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    }
    
    return { onMove, onEnd };
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
