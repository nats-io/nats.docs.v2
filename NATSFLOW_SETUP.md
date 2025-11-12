# NatsFlow Integration - Setup Complete

## Overview

NatsFlow is now fully integrated into the NATS documentation site. It provides interactive, animated React Flow diagrams that work in **regular Markdown (.md) files** - no MDX required!

## Architecture

### Components

```
src/components/NatsFlow/          # React Flow components
├── index.tsx                     # Main NatsFlow component
├── types.ts                      # TypeScript definitions
├── nodes/                        # Custom node components
│   ├── PublisherNode.tsx
│   ├── SubscriberNode.tsx
│   └── ServiceNode.tsx
├── edges/
│   └── AnimatedEdge.tsx         # Animated message flows
└── scenarios/                    # Prebuilt NATS patterns
    ├── publishSubscribe.ts
    ├── requestReply.ts
    ├── queueGroup.ts
    └── fanOut.ts
```

### Plugin System

```
src/plugins/nats-flow/            # Docusaurus plugin
├── index.ts                      # Plugin definition
└── client-module.tsx             # Client-side initialization
```

The plugin:
1. Bundles NatsFlow components at build time
2. Makes them globally available via `window.NatsFlow`
3. Fires a `natsflow-loaded` event when ready

### Loader Script

```
static/js/nats-flow-loader.js     # Vanilla JS loader
```

The loader:
1. Waits for `window.NatsFlow` to be available
2. Finds all `<div class="nats-flow">` elements
3. Renders React components into them
4. Works with Docusaurus client-side navigation

## Usage in Markdown

Simply add HTML div tags with the `nats-flow` class:

```markdown
# My NATS Documentation

## Publish-Subscribe Pattern

<div class="nats-flow" data-scenario="publishSubscribe"></div>

When a publisher sends a message...
```

### Available Scenarios

#### 1. Publish-Subscribe
```html
<div class="nats-flow" data-scenario="publishSubscribe"></div>
```

#### 2. Request-Reply
```html
<div class="nats-flow" data-scenario="requestReply"></div>
```

#### 3. Queue Groups
```html
<div class="nats-flow" data-scenario="queueGroup"></div>
```

#### 4. Fan-Out
```html
<div class="nats-flow" data-scenario="fanOut"></div>
```

### Customization

Use data attributes to customize:

```html
<!-- Custom size -->
<div class="nats-flow"
     data-scenario="publishSubscribe"
     data-width="800"
     data-height="500">
</div>

<!-- Hide controls -->
<div class="nats-flow"
     data-scenario="requestReply"
     data-show-controls="false">
</div>
```

#### Options

- `data-scenario`: Required. One of: `publishSubscribe`, `requestReply`, `queueGroup`, `fanOut`
- `data-width`: Width in pixels (default: 600)
- `data-height`: Height in pixels (default: 400)
- `data-show-controls`: Show zoom/pan controls (default: true)

## How It Works

### Build Time
1. **Docusaurus builds** → Compiles React components
2. **Plugin runs** → Registers client module
3. **Client module loads** → Makes `window.NatsFlow` available

### Runtime (Browser)
1. **Page loads** → nats-flow-loader.js executes
2. **Waits for components** → Listens for `natsflow-loaded` event
3. **Finds containers** → Queries for `.nats-flow` elements
4. **Renders diagrams** → Uses React.createElement + ReactDOM.createRoot

### Navigation
- **MutationObserver** watches for new `.nats-flow` elements
- Automatically initializes diagrams on Docusaurus navigation
- No page refresh needed

## Testing

Start the dev server:

```bash
cd /Users/tomaszpietrek/coding/new-nats.docs
npm start
```

Visit: http://localhost:3000/concepts/natsflow-demo

## Adding New Scenarios

### 1. Create the scenario file

`src/components/NatsFlow/scenarios/myPattern.ts`:

```typescript
import { MarkerType } from '@xyflow/react';
import type { NatsFlowScenario } from '../types';

export const myPatternScenario: NatsFlowScenario = {
  description: 'My custom NATS pattern',
  nodes: [
    {
      id: 'node1',
      type: 'publisher',
      position: { x: 50, y: 150 },
      data: { label: 'Publisher' },
    },
    {
      id: 'node2',
      type: 'subscriber',
      position: { x: 350, y: 150 },
      data: { label: 'Subscriber' },
    },
  ],
  edges: [
    {
      id: 'e1',
      source: 'node1',
      target: 'node2',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#3b82f6', animated: true, label: 'my.subject' },
    },
  ],
};
```

### 2. Export from scenarios/index.ts

```typescript
export { myPatternScenario } from './myPattern';
```

### 3. Register in client module

`src/plugins/nats-flow/client-module.tsx`:

```typescript
window.NatsFlow = {
  NatsFlow: module.NatsFlow,
  scenarios: {
    // ... existing scenarios
    myPattern: module.myPatternScenario,
  },
};
```

### 4. Use in Markdown

```html
<div class="nats-flow" data-scenario="myPattern"></div>
```

## Node Types

### Publisher Node
- Green indicator dot
- Source handle (right)
- For message publishers

### Subscriber Node
- Blue indicator dot
- Target handle (left)
- For message subscribers

### Service Node
- Purple indicator dot
- Target handle (left, top) - requests
- Source handle (right, bottom) - replies
- For request-reply services

## Edge Types

### Animated Edge
- Bezier curves between nodes
- Animated particles flow when `animated: true`
- Customizable color, size, labels

## Styling

Uses Tailwind CSS classes with NATS brand colors:

- Primary Blue: `#3b82f6`
- Green: `#10b981`
- Orange: `#f97316`
- Purple: `#8b5cf6`
- Cyan: `#06b6d4`

## Debugging

### Browser Console

Check for:
- `NatsFlow components loaded` - Plugin initialized
- `Failed to load NatsFlow component` - Import error
- `Unknown scenario: X` - Invalid scenario name

### React DevTools

Add `?debug=true` to enable React DevTools and inspect components.

### TypeScript

```bash
npm run typecheck
```

Should show no errors in:
- `src/components/NatsFlow/**`
- `src/plugins/nats-flow/**`
- `src/types/global.d.ts`

## Files Modified/Created

### Created
- `src/components/NatsFlow/` - All component files
- `src/plugins/nats-flow/` - Plugin files
- `src/types/global.d.ts` - Global type definitions
- `static/js/nats-flow-loader.js` - Loader script
- `docs/concepts/natsflow-demo.md` - Demo page

### Modified
- `docusaurus.config.ts` - Added plugin and script
- `package.json` - Added dependencies

### Dependencies Added
- `@xyflow/react` - React Flow library
- `clsx` - Utility classes
- `tailwind-merge` - Tailwind class merging

## Benefits

1. **No MDX Required** - Works in regular .md files
2. **Interactive** - Zoom, pan, animated flows
3. **Reusable** - Prebuilt scenarios for common patterns
4. **Extensible** - Easy to add new scenarios
5. **Performant** - Bundled at build time
6. **Integrated** - Works with Docusaurus navigation

## Credits

Based on React Flow implementation from `kubecon25-flow-ui`, adapted for Docusaurus with custom plugin architecture.
