// Drag functionality with proper cleanup

let draggedElement = null;
let dragCleanup = null;

export function makeDraggable(element, handle) {
  handle.style.cursor = 'move';
  
  handle.addEventListener('mousedown', startDrag);
  
  function startDrag(e) {
    e.preventDefault();
    if (element.dataset.minimized === 'true') return;
    
    draggedElement = element;
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = element.offsetLeft;
    const startTop = element.offsetTop;
    
    function onMouseMove(e) {
      e.preventDefault();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      element.style.left = (startLeft + dx) + 'px';
      element.style.top = (startTop + dy) + 'px';
    }
    
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      draggedElement = null;
      import('./storage.js').then(({ debouncedSave }) => debouncedSave());
    }
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Store cleanup for emergency
    dragCleanup = () => {
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
