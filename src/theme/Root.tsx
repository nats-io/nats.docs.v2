import React, { useState, useEffect } from 'react';
import { useLocation } from '@docusaurus/router';
import DocsIframe from '@site/src/components/DocsIframe';

function generateCookieId() {
  const charset = '0123456789abcdefghijklmnopqrstuvwxyz';
  const length = 13;
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  
  return 'nex_cloud_shell_' + result;
}

function getCookie() {
  let cookie = localStorage.getItem('nexCloudShell');
  if (!cookie) {
    cookie = generateCookieId();
    localStorage.setItem('nexCloudShell', cookie);
    console.log('New nex_cloud_shell created:', cookie);
  }
  return cookie;
}

export default function Root({ children }) {
  const location = useLocation();
  const [cookieId, setCookieId] = useState<string | null>(null);
  const [iframeState, setIframeState] = useState({
    position: 'bottom' as 'bottom' | 'right',
    isOpen: false,
    width: 40
  });
  
  // Only show the iframe on docs pages (not on the homepage)
  const isDocsPage = location.pathname !== '/' && !location.pathname.startsWith('/markdown-page');
  
  const handleIframePositionChange = (position: 'bottom' | 'right', isOpen: boolean, width: number) => {
    setIframeState({ position, isOpen, width });
  };

  // Initialize cookie on component mount
  useEffect(() => {
    const cookie = getCookie();
    setCookieId(cookie);
  }, []);

  // Send POST request only when on docs pages
  useEffect(() => {
    if (isDocsPage && cookieId) {
      // Send POST request with cookie
      fetch('https://init.docs.synadia.app/api/cookie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ cookie: cookieId })
      })
      .then(response => response.json())
      .then(data => {
        console.log('Cookie POST response:', data);
      })
      .catch(error => {
        console.error('Error posting cookie:', error);
      });
    }
  }, [isDocsPage, cookieId]);

  useEffect(() => {
    // Add styles to adjust content when iframe is open on the right
    if (iframeState.position === 'right' && iframeState.isOpen) {
      const style = document.createElement('style');
      style.id = 'iframe-right-styles';
      style.textContent = `
        /* Adjust main content containers */
        main {
          margin-right: ${iframeState.width}vw;
          transition: margin-right 0.3s ease-in-out;
        }
        /* Keep navbar full width */
        nav.navbar {
          margin-right: 0 !important;
        }
      `;
      document.head.appendChild(style);
    } else {
      const existingStyle = document.getElementById('iframe-right-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    }

    return () => {
      const existingStyle = document.getElementById('iframe-right-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [iframeState]);
  
  return (
    <>
      {children}
      {isDocsPage && cookieId && (
        <DocsIframe 
          cookieId={cookieId}
          onPositionChange={handleIframePositionChange} 
        />
      )}
    </>
  );
}