/**
 * NATS Flow Loader
 * Loads and renders NatsFlow React components in regular Markdown files
 */

(function() {
  // Wait for NatsFlow components to be loaded
  function waitForNatsFlow() {
    return new Promise((resolve) => {
      if (window.NatsFlow) {
        resolve(window.NatsFlow);
        return;
      }

      // Listen for the custom event
      window.addEventListener('natsflow-loaded', () => {
        resolve(window.NatsFlow);
      }, { once: true });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!window.NatsFlow) {
          console.error('NatsFlow components failed to load within timeout');
          resolve(null);
        }
      }, 10000);
    });
  }

  // Wait for React to be available (loaded by Docusaurus)
  function waitForReact() {
    return new Promise((resolve) => {
      const checkReact = () => {
        // React is available via Docusaurus
        if (window.React && window.ReactDOM) {
          resolve({ React: window.React, ReactDOM: window.ReactDOM });
          return;
        }
        // Keep checking
        setTimeout(checkReact, 100);
      };
      checkReact();
    });
  }

  // Initialize NatsFlow components on the page
  async function initializeFlows() {
    const containers = document.querySelectorAll('.nats-flow:not([data-initialized])');

    if (containers.length === 0) {
      return;
    }

    // Wait for components to be available
    const components = await waitForNatsFlow();
    if (!components) {
      console.error('NatsFlow components not available');
      containers.forEach((container) => {
        container.innerHTML = `<div style="padding: 1rem; background: #fee; border: 1px solid #fcc; border-radius: 4px;">
          <strong>Error:</strong> NatsFlow components failed to load
        </div>`;
        container.setAttribute('data-initialized', 'true');
      });
      return;
    }

    const { NatsFlow, ToggleableSubscribersScenario, scenarios } = components;

    // Wait for React to be available
    const { React, ReactDOM } = await waitForReact();

    containers.forEach((container) => {
      const scenarioName = container.dataset.scenario;
      const width = parseInt(container.dataset.width || '600', 10);
      const height = parseInt(container.dataset.height || '400', 10);
      const showControls = container.dataset.showControls === 'true';

      try {
        // Special case: toggleableSubscribers uses a custom interactive component
        if (scenarioName === 'toggleableSubscribers') {
          const root = ReactDOM.createRoot(container);
          const element = React.createElement(ToggleableSubscribersScenario, {
            width,
            height,
          });
          root.render(element);
          container.setAttribute('data-initialized', 'true');
          return;
        }

        // Generic: any "<name>Animated" data-scenario renders the matching
        // PascalCase component exported on window.NatsFlow
        // (e.g. "clusterMeshAnimated" -> ClusterMeshAnimated). New animated
        // scenarios need NO edit here — just export the component from the
        // NatsFlow barrel and register it in client-module.tsx.
        if (scenarioName && scenarioName.endsWith('Animated')) {
          const componentName = scenarioName.charAt(0).toUpperCase() + scenarioName.slice(1);
          const AnimatedComponent = components[componentName];
          if (typeof AnimatedComponent === 'function') {
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(AnimatedComponent, { width, height }));
            container.setAttribute('data-initialized', 'true');
            return;
          }
          console.error(`Unknown animated scenario: ${scenarioName} (expected component ${componentName} on window.NatsFlow)`);
        }

        const scenario = scenarios[scenarioName];

        if (!scenario) {
          console.error(`Unknown scenario: ${scenarioName}`);
          container.innerHTML = `<div style="padding: 1rem; background: #fee; border: 1px solid #fcc; border-radius: 4px;">
            <strong>Error:</strong> Unknown scenario "${scenarioName}".
            <br>Available scenarios: ${Object.keys(scenarios).join(', ')}
          </div>`;
          container.setAttribute('data-initialized', 'true');
          return;
        }

        // Create a root and render the NatsFlow component
        const root = ReactDOM.createRoot(container);
        const element = React.createElement(NatsFlow, {
          scenario,
          width,
          height,
          showControls,
        });
        root.render(element);

        container.setAttribute('data-initialized', 'true');
      } catch (error) {
        console.error(`Failed to initialize flow for scenario ${scenarioName}:`, error);
        container.innerHTML = `<div style="padding: 1rem; background: #fee; border: 1px solid #fcc; border-radius: 4px;">
          <strong>Error:</strong> Failed to render flow diagram
          <br><small>${error.message}</small>
        </div>`;
        container.setAttribute('data-initialized', 'true');
      }
    });
  }

  // Initialize when ready
  function tryInit() {
    initializeFlows();
  }

  // Multiple strategies to ensure initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    setTimeout(tryInit, 100);
  }

  // Also listen for the natsflow-loaded event
  window.addEventListener('natsflow-loaded', tryInit);

  // MutationObserver for dynamic content (Docusaurus navigation)
  const observer = new MutationObserver(() => {
    const hasNew = document.querySelector('.nats-flow:not([data-initialized])');
    if (hasNew) {
      tryInit();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
