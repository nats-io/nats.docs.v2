/**
 * NATS Example Loader v2
 * Loads and displays NATS code examples in regular Markdown files
 */

(function() {

  // CLI examples fallback (kept for backwards compatibility)
  const cliExamples = {
    'basics-publish': `# Publish a message
nats pub weather.updates "Temperature: 72°F"`,
    'basics-subscribe': `# Subscribe to weather updates
nats sub weather.updates`,
  };

  const languageMap = {
    'cli': { label: 'CLI', lang: 'bash' },
    'go': { label: 'Go', lang: 'go' },
    'rust': { label: 'Rust', lang: 'rust' },
    'python': { label: 'Python', lang: 'python' },
    'java': { label: 'Java', lang: 'java' },
    'js': { label: 'JavaScript/TypeScript', lang: 'javascript' },
    'javascript': { label: 'JavaScript/TypeScript', lang: 'javascript' },
    'csharp': { label: 'C#/.NET', lang: 'csharp' }
  };

  // Store fetched examples globally to avoid re-fetching
  let cachedExamples = null;

  // Fetch examples from static files
  async function fetchExamples() {
    if (cachedExamples) {
      return cachedExamples;
    }

    const examples = {};

    try {
      // Fetch metadata
      const metaResponse = await fetch('/examples/snippets/metadata.json');
      if (!metaResponse.ok) {
        console.warn('Failed to fetch metadata:', metaResponse.status);
        return {};
      }

      const metadata = await metaResponse.json();

      // Load snippets based on metadata
      for (const [language, langExamples] of Object.entries(metadata.examples || metadata.results || {})) {
        examples[language] = {};
        
        for (const [type, info] of Object.entries(langExamples)) {
          if (info && info.path) {
            try {
              const snippetPath = `/examples/snippets/${info.path}`;

              const response = await fetch(snippetPath);
              if (response.ok) {
                examples[language][type] = await response.text();
              } else {
                console.warn(`✗ Failed to load ${language}/${type}: ${response.status}`);
              }
            } catch (e) {
              console.error(`Error loading ${language}/${type}:`, e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch examples:', error);
    }

    cachedExamples = examples;
    return examples;
  }

  // Create tabs HTML
  function createTabs(type, languages, examples) {
    const availableLanguages = languages.filter(lang => {
      // Normalize language key (js -> javascript)
      const normalizedLang = lang === 'js' ? 'javascript' : lang;

      if (normalizedLang === 'cli') {
        // Check both fetched examples and fallback hardcoded examples
        return (examples['cli'] && examples['cli'][type]) || !!cliExamples[type];
      }
      return examples[normalizedLang] && examples[normalizedLang][type];
    });

    if (availableLanguages.length === 0) {
      return `<div style="padding: 1rem; background: #f0f0f0; border-radius: 4px;">
        <em>No examples available for "${type}".</em>
      </div>`;
    }

    // Generate unique ID for this tab group
    const tabId = 'nats-tabs-' + Math.random().toString(36).substr(2, 9);
    
    // Create tab buttons
    const tabButtons = availableLanguages.map((lang, index) => {
      const { label } = languageMap[lang];
      const activeClass = index === 0 ? 'active' : '';
      return `<button class="nats-tab-button ${activeClass}" data-tab="${tabId}" data-panel="${lang}">
        ${label}
      </button>`;
    }).join('');

    // Create tab panels
    const tabPanels = availableLanguages.map((lang, index) => {
      // Normalize language key (js -> javascript)
      const normalizedLang = lang === 'js' ? 'javascript' : lang;
      const { lang: prismLang } = languageMap[lang];

      let code;
      if (normalizedLang === 'cli') {
        // Use fetched CLI example if available, fallback to hardcoded
        code = (examples['cli'] && examples['cli'][type]) || cliExamples[type];
      } else {
        code = examples[normalizedLang][type];
      }

      const activeStyle = index === 0 ? 'block' : 'none';
      const langClass = prismLang ? `language-${prismLang}` : '';
      
      return `<div class="nats-tab-panel" data-tab="${tabId}" data-panel="${lang}" style="display: ${activeStyle};">
        <pre><code class="language-${prismLang || 'text'}">${escapeHtml(code || '// Code not found')}</code></pre>
      </div>`;
    }).join('');

    return `
      <div class="nats-tabs">
        <div class="nats-tab-buttons">
          ${tabButtons}
        </div>
        <div class="nats-tab-content">
          ${tabPanels}
        </div>
      </div>
    `;
  }

  // Helper to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Load Prism for dynamic code highlighting
  // Note: We need Prism from CDN for dynamically generated tabs because
  // Docusaurus's prism-react-renderer only works for React-rendered content
  function ensurePrismLoaded() {
    return new Promise((resolve) => {
      // If Prism is already available, use it
      if (window.Prism) {
        resolve();
        return;
      }

      // Check if we're already loading
      if (window.prismLoadInProgress) {
        const checkInterval = setInterval(() => {
          if (window.Prism) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
        return;
      }

      window.prismLoadInProgress = true;

      // Load Prism CSS (light theme - dark mode handled via CSS overrides)
      // Note: Docusaurus uses prism-react-renderer with inline styles,
      // so we need separate CSS for our dynamically generated HTML
      const prismCSS = document.createElement('link');
      prismCSS.rel = 'stylesheet';
      prismCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css';
      prismCSS.id = 'prism-dynamic-css';
      document.head.appendChild(prismCSS);

      // Load Prism core
      const prismScript = document.createElement('script');
      prismScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js';
      prismScript.onload = () => {
        // Configure Prism
        if (window.Prism) {
          window.Prism.manual = true; // Disable automatic highlighting
        }

        // Load language components needed for NATS examples
        const languages = ['bash', 'go', 'rust'];
        let loadedCount = 0;

        languages.forEach(lang => {
          const langScript = document.createElement('script');
          langScript.src = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-${lang}.min.js`;
          langScript.onload = () => {
            loadedCount++;
            if (loadedCount === languages.length) {
              window.prismLoadInProgress = false;
              resolve();
            }
          };
          langScript.onerror = () => {
            loadedCount++;
            if (loadedCount === languages.length) {
              window.prismLoadInProgress = false;
              resolve();
            }
          };
          document.head.appendChild(langScript);
        });
      };
      prismScript.onerror = () => {
        console.error('Failed to load Prism');
        window.prismLoadInProgress = false;
        resolve();
      };
      document.head.appendChild(prismScript);
    });
  }

  // Initialize examples on the page
  async function initializeExamples() {
    const containers = document.querySelectorAll('.nats-example:not([data-initialized])');

    if (containers.length === 0) {
      return;
    }

    // Ensure Prism is loaded before proceeding
    await ensurePrismLoaded();

    const examples = await fetchExamples();

    containers.forEach((container, index) => {
      const type = container.dataset.type;
      const languages = (container.dataset.languages || 'cli,go,rust').split(',');

      try {
        container.innerHTML = createTabs(type, languages, examples);
        container.setAttribute('data-initialized', 'true');

        // Add click handlers for tabs within this container
        container.querySelectorAll('.nats-tab-button').forEach(button => {
          button.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            const panel = this.dataset.panel;

            // Update active button
            container.querySelectorAll(`.nats-tab-button[data-tab="${tabId}"]`).forEach(btn => {
              btn.classList.remove('active');
            });
            this.classList.add('active');

            // Update visible panel
            container.querySelectorAll(`.nats-tab-panel[data-tab="${tabId}"]`).forEach(pnl => {
              pnl.style.display = 'none';
            });
            const activePanel = container.querySelector(`.nats-tab-panel[data-tab="${tabId}"][data-panel="${panel}"]`);
            if (activePanel) {
              activePanel.style.display = 'block';
              // Trigger Prism syntax highlighting on tab switch
              if (window.Prism && window.Prism.highlightAllUnder) {
                window.Prism.highlightAllUnder(activePanel);
              }
            }
          });
        });

        // Trigger initial syntax highlighting
        if (window.Prism) {
          // Highlight all code blocks in this container
          if (window.Prism.highlightAllUnder) {
            window.Prism.highlightAllUnder(container);
          } else {
            // Fallback: highlight individual elements
            container.querySelectorAll('pre code[class*="language-"]').forEach(block => {
              window.Prism.highlightElement(block);
            });
          }
        } else {
          console.warn('Prism not available for highlighting');
        }
      } catch (error) {
        console.error(`Failed to initialize container ${index}:`, error);
      }
    });
  }

  // Add styles
  if (!document.getElementById('nats-example-styles')) {
    const style = document.createElement('style');
    style.id = 'nats-example-styles';
    style.textContent = `
      .nats-tabs {
        margin: 1rem 0;
      }
      .nats-tab-buttons {
        display: flex;
      }
      .nats-tab-button {
        padding: 0.5rem 1rem;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--ifm-font-color-base);
        border-bottom: 3px solid transparent;
        transition: all 0.2s;
      }
      .nats-tab-button:hover {
        border-bottom-color: var(--ifm-tabs-color-active-border);
      }
      .nats-tab-button.active {
        color: var(--ifm-tabs-color-active);
        border-bottom-color: var(--ifm-tabs-color-active-border);
      }
      .nats-tab-content {
        background: transparent;
      }
      .nats-tab-panel pre {
        margin-top: var(--ifm-leading);
        padding: 1rem;
        overflow-x: auto;
      }
      .nats-tab-panel pre[class*="language-"] {
        border-radius: var(--ifm-code-border-radius);
      }
      .nats-tab-panel code {
        background: none;
        padding: 0;
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize when ready
  function tryInit() {
    initializeExamples();
  }

  // Multiple strategies to ensure initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    setTimeout(tryInit, 100);
  }

  // MutationObserver for dynamic content
  const observer = new MutationObserver(() => {
    const hasNew = document.querySelector('.nats-example:not([data-initialized])');
    if (hasNew) {
      tryInit();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();