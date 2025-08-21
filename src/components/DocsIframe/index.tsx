import React, { useState, useRef, useEffect } from "react";
import styles from "./styles.module.css";

type Position = "bottom" | "right";

interface DocsIframeProps {
  cookieId: string;
  onPositionChange?: (position: Position, isOpen: boolean, width: number) => void;
}

export default function DocsIframe({ cookieId, onPositionChange }: DocsIframeProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Position>("bottom");
  const [height, setHeight] = useState(50); // percentage for bottom position
  const [width, setWidth] = useState(40); // percentage for right position
  const [isResizing, setIsResizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Extract just the ID part from nex_cloud_shell_xxxxxxxxxxxxx
  const id = cookieId.replace('nex_cloud_shell_', '');
  const iframeUrl = `https://${id}.docs.synadia.app`;

  const checkDocsReady = async () => {
    let checkCount = 0;
    
    const checkFor200 = async () => {
      checkCount++;
      console.log(`Attempt ${checkCount}: Checking ${iframeUrl}...`);
      
      try {
        // Use the server endpoint to check status
        const response = await fetch(`https://init.docs.synadia.app/api/check-docs?id=${id}`);
        const data = await response.json();
        
        if (data.ready) {
          console.log('Got 200! Loading iframe...');
          setIframeReady(true);
          setIsLoading(false);
        } else {
          console.log(`Got status ${data.status}, retrying in 2 seconds...`);
          setTimeout(checkFor200, 2000);
        }
      } catch (error) {
        console.log('Error checking status, retrying in 2 seconds...');
        setTimeout(checkFor200, 2000);
      }
    };
    
    checkFor200();
  };

  const toggleIframe = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    onPositionChange?.(position, newIsOpen, width);
    
    // Start loading when opening for the first time
    if (newIsOpen && !iframeReady) {
      setIsLoading(true);
      checkDocsReady();
    }
  };

  const togglePosition = () => {
    const newPosition = position === "bottom" ? "right" : "bottom";
    setPosition(newPosition);
    onPositionChange?.(newPosition, isOpen, width);
  };

  const openInNewTab = () => {
    window.open(iframeUrl, "_blank");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Removed the useEffect that was causing infinite loops
  // onPositionChange is already called in the appropriate event handlers

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      if (position === "bottom") {
        const windowHeight = window.innerHeight;
        const newHeight = ((windowHeight - e.clientY) / windowHeight) * 100;
        setHeight(Math.min(Math.max(newHeight, 20), 80)); // Between 20% and 80%
      } else {
        const windowWidth = window.innerWidth;
        const newWidth = ((windowWidth - e.clientX) / windowWidth) * 100;
        const clampedWidth = Math.min(Math.max(newWidth, 20), 70); // Between 20% and 70%
        if (clampedWidth !== width) {
          setWidth(clampedWidth);
          onPositionChange?.(position, isOpen, clampedWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, position, isOpen, width, onPositionChange]);

  const containerStyle: React.CSSProperties = isOpen
    ? position === "bottom"
      ? { height: `${height}vh` }
      : { width: `${width}vw` }
    : {};

  return (
    <div
      ref={containerRef}
      className={`${styles.iframeContainer} ${
        isOpen ? styles.open : ""
      } ${styles[position]} ${isResizing ? styles.resizing : ""}`}
      style={containerStyle}
    >
      {isOpen && (
        <div
          className={`${styles.resizeHandle} ${styles[`resizeHandle-${position}`]}`}
          onMouseDown={handleMouseDown}
        />
      )}
      <div className={styles.controls}>
        <button
          onClick={toggleIframe}
          className={styles.toggleButton}
          aria-label={isOpen ? "Collapse iframe" : "Open iframe"}
        >
          {isOpen ? "▼ Collapse" : "▲ Open Terminal"}
        </button>
        {isOpen && (
          <button
            onClick={togglePosition}
            className={styles.positionButton}
            aria-label={`Move to ${position === "bottom" ? "right" : "bottom"}`}
            title={`Move to ${position === "bottom" ? "right" : "bottom"}`}
          >
            {position === "bottom" ? "→ Move Right" : "↓ Move Bottom"}
          </button>
        )}
        <button
          onClick={openInNewTab}
          className={styles.newTabButton}
          aria-label="Open in new tab"
        >
          Open in New Tab ↗
        </button>
      </div>
      {isOpen && (
        <>
          {isLoading && (
            <div className={styles.loadingSpinner}>
              <div className={styles.spinner}></div>
              <p>Waiting for documentation site to be ready...</p>
              <p className={styles.loadingSubtext}>This usually takes about 15 seconds</p>
            </div>
          )}
          {iframeReady && (
            <iframe
              src={iframeUrl}
              className={styles.iframe}
              title="NATS Documentation Assistant"
            />
          )}
        </>
      )}
    </div>
  );
}