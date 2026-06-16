import { debouncedSave } from './storage.js';

let dragCleanup = null;
let touchDragCleanup = null;

export function makeDraggable(element, handle) {
  handle.style.cursor = 'move';
  handle.style.touchAction = 'none';
  
  handle.addEventListener('mousedown', startDrag);
  handle.addEventListener('touchstart', startDragTouch, { passive: false });
  
  function startDrag(e) {
    e.preventDefault();
    initiateDrag(e.clientX, e.clientY, 'mouse');
  }
  
  function startDragTouch(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dragState = initiateDrag(touch.clientX, touch.clientY, 'touch');
    if (!dragState) return;
    
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

    touchDragCleanup = () => {
      if (dragState.rafId) cancelAnimationFrame(dragState.rafId);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }
  
  function initiateDrag(clientX, clientY, inputType) {
    if (element.dataset.minimized === 'true') return null;
    
    const startLeft = element.offsetLeft;
    const startTop = element.offsetTop;
    let lastX = clientX;
    let lastY = clientY;
    let currentDx = 0;
    let currentDy = 0;
    let rafId = null;
    
    function applyMovement() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const noteW = element.offsetWidth;
      const noteH = element.offsetHeight;
      const clampedLeft = Math.max(0, Math.min(startLeft + currentDx, vw - noteW));
      const clampedTop = Math.max(0, Math.min(startTop + currentDy, vh - noteH));
      element.style.left = clampedLeft + 'px';
      element.style.top = clampedTop + 'px';
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
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const noteW = element.offsetWidth;
      const noteH = element.offsetHeight;
      const finalLeft = Math.max(0, Math.min(startLeft + currentDx, vw - noteW));
      const finalTop = Math.max(0, Math.min(startTop + currentDy, vh - noteH));
      element.style.left = finalLeft + 'px';
      element.style.top = finalTop + 'px';
      debouncedSave();
    }
    
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
    
    return { onMove, onEnd, rafId };
  }
}

export function initDragCleanup() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (dragCleanup) {
        dragCleanup();
        dragCleanup = null;
      }
      if (touchDragCleanup) {
        touchDragCleanup();
        touchDragCleanup = null;
      }
    }
  });
}
