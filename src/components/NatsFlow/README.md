# NatsFlow Component

Interactive flow diagrams for NATS messaging patterns, built with React Flow.

## Overview

NatsFlow provides animated, interactive visualizations of NATS messaging patterns directly in Markdown documentation files. No MDX required!

## Usage in Markdown

Simply add a `<div>` tag with the `nats-flow` class:

```html
<div class="nats-flow" data-scenario="publishSubscribe"></div>
```

### Available Scenarios

#### 1. Publish-Subscribe
Shows one-to-many messaging pattern.

```html
<div class="nats-flow" data-scenario="publishSubscribe"></div>
```

#### 2. Request-Reply
Shows request-response pattern with a service.

```html
<div class="nats-flow" data-scenario="requestReply"></div>
```

#### 3. Queue Groups
Shows load-balanced message distribution.

```html
<div class="nats-flow" data-scenario="queueGroup"></div>
```

#### 4. Fan-Out
Shows broadcasting to multiple independent services.

```html
<div class="nats-flow" data-scenario="fanOut"></div>
```

### Options

Customize the diagram with data attributes:

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

#### Available Options

- `data-scenario` (required): The scenario to display
  - `publishSubscribe`
  - `requestReply`
  - `queueGroup`
  - `fanOut`
- `data-width`: Width in pixels (default: 600)
- `data-height`: Height in pixels (default: 400)
- `data-show-controls`: Show zoom/pan controls (default: true)

## Architecture

### Component Structure

```
NatsFlow/
├── index.tsx              # Main NatsFlow component
├── types.ts               # TypeScript type definitions
├── README.md              # This file
├── nodes/                 # Custom node components
│   ├── BaseNode.tsx       # Styled base node
│   ├── PublisherNode.tsx  # Publisher node
│   ├── SubscriberNode.tsx # Subscriber node
│   └── ServiceNode.tsx    # Service/responder node
├── edges/                 # Custom edge components
│   └── AnimatedEdge.tsx   # Animated message flow
├── scenarios/             # Prebuilt scenarios
│   ├── publishSubscribe.ts
│   ├── requestReply.ts
│   ├── queueGroup.ts
│   └── fanOut.ts
├── hooks/                 # React hooks
│   └── useInterval.ts     # Interval hook
└── lib/                   # Utilities
    └── utils.ts           # Helper functions
```

### How It Works

1. **Markdown Files**: Documentation authors add `<div class="nats-flow">` tags
2. **JavaScript Loader** (`/static/js/nats-flow-loader.js`):
   - Scans the page for `.nats-flow` elements
   - Dynamically imports the React component
   - Renders the appropriate scenario into each container
3. **React Components**: Handle the visualization and animation

### Key Features

- Works in regular Markdown (`.md`) files
- Animated message flows
- Interactive (zoom/pan optional)
- Prebuilt NATS patterns
- Automatic initialization via MutationObserver (works with Docusaurus navigation)

## Adding New Scenarios

There are two kinds of scenario. Most new work uses the **animated** kind.

| Kind | File | When |
|------|------|------|
| **Animated component** (`.tsx`) | `scenarios/<name>Animated.tsx` exporting a React component `XxxAnimated` | Anything with motion, steps, state, or toggles — the default for new charts |
| **Static scenario** (`.ts`) | `scenarios/<name>.ts` exporting a `{ description, nodes, edges }` object | A fixed diagram with no animation logic |

> Don't write a scenario from scratch — copy the closest existing one. For a
> round-trip (request → reply, publish → ack) start from
> `requestRetryAnimated.tsx`; for a multi-node topology start from
> `clusterMeshAnimated.tsx`. Both show the standard shape below.

### Animated component (the common case)

The runtime loader auto-resolves any `data-scenario` ending in `Animated` to
the **PascalCase** component on `window.NatsFlow` — so `data-scenario="myFlowAnimated"`
looks up `MyFlowAnimated`. Wire it up in **four** places (the component file
shows none of these, which is why they're easy to miss):

1. **Create** `scenarios/myFlowAnimated.tsx`. The shape:

```tsx
import { ReactFlow, ReactFlowProvider, Background, MarkerType } from '@xyflow/react';
import { PublisherNode, ServerNode } from '../nodes';   // reuse shared nodes
import { AnimatedEdge } from '../edges';

const nodeTypes = { publisher: PublisherNode, server: ServerNode /* + custom inline nodes */ };
const edgeTypes = { animated: AnimatedEdge };

function MyFlowAnimatedInner({ width = 600, height = 320 }) {
  const [stage, setStage] = useState('a');          // a stage state machine,
  useEffect(() => { /* setTimeout to advance stage, loop */ }, [stage]);
  const nodes = [ /* rebuilt from `stage` each render */ ];
  const edges = [ /* only the active stage's edges; AnimatedEdge data:
                     { color, label, labelColor, animated, interval } */ ];
  return (<div>{/* stepper buttons */}<ReactFlow nodes={nodes} edges={edges}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView .../>{/* caption */}</div>);
}

// Always wrap in ReactFlowProvider.
export function MyFlowAnimated(props) {
  return <ReactFlowProvider><MyFlowAnimatedInner {...props} /></ReactFlowProvider>;
}
```

2. **Export** from `scenarios/index.ts`:

```typescript
export { MyFlowAnimated } from './myFlowAnimated';
```

3. **Register** on `window.NatsFlow` in `src/plugins/nats-flow/client-module.tsx`
   (the top-level object, *not* the nested `scenarios` map):

```typescript
MyFlowAnimated: module.MyFlowAnimated,
```

4. **Add fallback text** in `scripts/rehype-nats-flow.mjs` — a `FALLBACKS` entry
   (the prose shown in non-JS / markdown / LLM output) and a `TITLES` entry.
   Skipping this is non-fatal but prints a build warning and yields generic
   markdown output:

```javascript
// FALLBACKS
myFlowAnimated: 'One or two sentences describing what the animation shows.',
// TITLES
myFlowAnimated: 'My flow (animated)',
```

Then embed it (note camelCase in the attribute):

```html
<div class="nats-flow" data-scenario="myFlowAnimated" data-width="600" data-height="320"></div>
```

### Static scenario

1. Create `scenarios/myScenario.ts` exporting a `NatsFlowScenario` object
   (`{ description, nodes, edges }`) — same node/edge shape as above.
2. Export it from `scenarios/index.ts`.
3. Add it to the `scenarios: { ... }` map inside `window.NatsFlow` in
   `src/plugins/nats-flow/client-module.tsx` (this is the lookup for any
   `data-scenario` that does **not** end in `Animated`).
4. Embed: `<div class="nats-flow" data-scenario="myScenario"></div>`.

> Custom node components register in the scenario's local `nodeTypes` map; for
> a node made of sub-parts, draw them inside one node component, or use
> `parentId` children. Keep internal mechanics (e.g. replication leader →
> followers) for the pages where they're real, not on intro flows.

## Node Types

### Publisher Node
- Green indicator
- Source handle (right side)
- Use for message publishers

### Subscriber Node
- Blue indicator
- Target handle (left side)
- Use for message subscribers

### Service Node
- Purple indicator
- Target handle (left, top) for requests
- Source handle (right, bottom) for replies
- Use for request-reply services

## Edge Types

### Animated Edge
- Bezier curves
- Animated particles flowing along the path
- Customizable color, size, and labels
- Set `animated: true` in edge data to enable animation

## Styling

The component uses Tailwind CSS classes for styling. Colors follow NATS brand guidelines:

- Primary Blue: `#3b82f6`
- Green (success): `#10b981`
- Orange (warning): `#f97316`
- Purple (service): `#8b5cf6`
- Cyan (info): `#06b6d4`

## Development

### Testing Locally

1. Start the dev server:
```bash
cd new-nats.docs
npm start
```

2. Add a test flow to any `.md` file:
```html
<div class="nats-flow" data-scenario="publishSubscribe"></div>
```

3. View at `http://localhost:3000`

### Debugging

Enable browser console to see:
- Component loading status
- Scenario errors
- Rendering issues

Add `?debug=true` to any URL to enable React DevTools.

## Dependencies

- `@xyflow/react`: React Flow library
- `react` & `react-dom`: React 19
- `clsx` & `tailwind-merge`: Utility class management

All dependencies are already included in the main project's `package.json`.

## Credits

Based on the React Flow implementation from the `kubecon25-flow-ui` demo, adapted for Docusaurus integration.
