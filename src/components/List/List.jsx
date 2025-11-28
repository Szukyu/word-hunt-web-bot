import { useRef, useState, useEffect, useCallback } from 'react';
import './List.css';

const List = ({
  items = [],
  onItemHover,
  showGradients = true,
  enableArrowNavigation = true,
  className = '',
  displayScrollbar = true,
  initialSelectedIndex = -1,
  listSize,
}) => {
  const listRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(0);
  const hoverTimeoutRef = useRef(null);
  // Ref to track if navigation is currently via keyboard
  const isKeyboardNavigatingRef = useRef(false);

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setTopGradientOpacity(Math.min(scrollTop / 30, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 30, 1)
    );
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Simple scroll to make item visible
  const ensureItemVisible = useCallback((index) => {
    const container = listRef.current;
    if (!container) return;

    // Use querySelector to find the item based on its data-index
    const item = container.querySelector(`[data-index="${index}"]`);
    if (!item) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    // Check if item needs to be scrolled into view
    if (itemRect.top < containerRect.top) {
      // Item is above viewport - scroll so item is at top (offset by 8px)
      container.scrollTop = item.offsetTop - 8;
    } else if (itemRect.bottom > containerRect.bottom) {
      // Item is below viewport - scroll so item is at bottom (offset by 16px)
      const targetScroll = item.offsetTop - containerRect.height + item.offsetHeight + 16;
      container.scrollTop = targetScroll;
    }
    // If item is already visible, don't scroll
  }, []);

  // Keyboard navigation event handlers (keydown/keyup)
  useEffect(() => {
    if (!enableArrowNavigation) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        
        // Mark navigation as keyboard-driven
        isKeyboardNavigatingRef.current = true;
        
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }

        const currentIndex = selectedIndex;
        let newIndex;
        
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex >= items.length - 1 ? 0 : currentIndex + 1;
        } else { // ArrowUp
          newIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        }

        // Update selection state
        setSelectedIndex(newIndex);
        
        // *** IMPORTANT: Removed synchronous scroll here. 
        // Scroll is now handled in the dedicated useEffect below. ***
        
      } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < items.length) {
        e.preventDefault();
        onItemHover?.(items[selectedIndex], selectedIndex);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        // Debounce turning off keyboard navigation flag
        setTimeout(() => {
          isKeyboardNavigatingRef.current = false;
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [items, selectedIndex, onItemHover, enableArrowNavigation]);
  
  // *** NEW useEffect for post-render scroll ***
  // Ensures the item is scrolled into view AFTER selectedIndex updates 
  // and the highlight has been applied to the new item in the DOM.
  useEffect(() => {
    // Only apply scroll if keyboard navigation is active
    if (isKeyboardNavigatingRef.current && selectedIndex >= 0 && selectedIndex < items.length) {
      ensureItemVisible(selectedIndex);
    }
    
    // Also call onItemHover here to ensure it fires reliably 
    // after the selection has settled, covering both keyboard and initial loads.
    if (selectedIndex >= 0 && selectedIndex < items.length) {
      onItemHover?.(items[selectedIndex], selectedIndex);
    }
  }, [selectedIndex, items, onItemHover, ensureItemVisible]);


  const handleItemHover = useCallback((item, index) => {
    // Prevent mouse hover logic from overriding keyboard navigation
    if (isKeyboardNavigatingRef.current) return;
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setSelectedIndex(index);
    onItemHover?.(item, index);
  }, [onItemHover]);

  const handleItemHoverDelayed = useCallback((item, index) => {
    if (isKeyboardNavigatingRef.current) return;
    
    // Use a short delay for hover intent
    hoverTimeoutRef.current = setTimeout(() => {
      handleItemHover(item, index);
    }, 10);
  }, [handleItemHover]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    // Disable keyboard navigation lock when mouse re-enters the list
    isKeyboardNavigatingRef.current = false;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  }, []);

  if (!items.length) {
    return (
      <div className={`list-container empty ${className}`} style={{ maxHeight: listSize }}>
        <div className="empty-state">
          <p>No words found</p>
          <span className="empty-subtitle">Try a different letter combination</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`list-container ${className}`} 
      style={{ maxHeight: listSize }}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      <div
        ref={listRef}
        // CSS for .list-scroll should include 'scroll-behavior: smooth;'
        className={`list-scroll ${!displayScrollbar ? 'no-scrollbar' : ''}`}
        onScroll={handleScroll}
      >
        {items.map((item, index) => (
          <div
            key={`${item.word}-${index}`}
            data-index={index}
            className={`list-item-wrapper ${selectedIndex === index ? 'selected' : ''}`}
            // Use onMouseEnter/onMouseOver for delayed hover effect
            onMouseEnter={() => handleItemHoverDelayed(item, index)}
            onMouseOver={() => handleItemHoverDelayed(item, index)}
            // Use onClick for immediate selection/action
            onClick={() => handleItemHover(item, index)}
          >
            <div className="list-item">
              <div className="item-rank">#{index + 1}</div>
              <div className="item-content">
                <span className="item-word">{item.word.toUpperCase()}</span>
                <span className="item-meta">{item.word.length} letters</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {showGradients && (
        <>
          <div
            className="list-gradient top"
            style={{ opacity: topGradientOpacity }}
          />
          <div
            className="list-gradient bottom"
            style={{ opacity: bottomGradientOpacity }}
          />
        </>
      )}
    </div>
  );
};

export default List;
