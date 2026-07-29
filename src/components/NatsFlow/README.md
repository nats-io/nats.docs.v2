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

Two kinds exist (see [Adding New Scenarios](#adding-new-scenarios)):

- **Animated components** — `data-scenario` names ending in `Animated`
  (e.g. `clusterMeshAnimated`, `kvWatchAnimated`). These make up most of the
  ~80 scenarios used across the Learn section.
- **Static scenarios** — fixed diagrams like `publishSubscribe`,
  `requestReply`, `queueGroup`, `fanOut`.

The authoritative list is the export list in
[`scenarios/index.ts`](./scenarios/index.ts).

```html
<div class="nats-flow" data-scenario="publishSubscribe"></div>
<div class="nats-flow" data-scenario="clusterMeshAnimated" data-width="600" data-height="350"></div>
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

- `data-scenario` (required): The scenario to display (see
  [`scenarios/index.ts`](./scenarios/index.ts) for the full list)
- `data-width`: Width in pixels (default: 600)
- `data-height`: Height in pixels (default: 400)
- `data-show-controls`: Show zoom/pan controls (default: **false**; pass
  `data-show-controls="true"` to enable)

## Architecture

### Component Structure

```
NatsFlow/
├── index.tsx              # Main NatsFlow component
├── types.ts               # TypeScript type definitions
├── README.md              # This file
├── nodes/                 # Custom node components
│   ├── BaseNode.tsx       # Styled base node
│   ├── PublisherNode.tsx / SubscriberNode.tsx / ServiceNode.tsx
│   └── ClientNode.tsx / ServerNode.tsx / LabelNode.tsx
├── edges/                 # Custom edge components
│   ├── AnimatedEdge.tsx   # Animated message flow
│   └── FloatingEdge.tsx   # Auto-anchoring edge for mesh topologies
├── scenarios/             # ~100 files: static .ts scenarios + *Animated.tsx components
├── icons/                 # Shared SVG icons
├── hooks/                 # React hooks (useInterval)
└── lib/                   # Utilities
```

### How It Works

1. **Markdown files**: authors add `<div class="nats-flow" data-scenario="...">` tags
2. **Docusaurus plugin** (`src/plugins/nats-flow/`): its client module
   dynamically imports the NatsFlow barrel, assigns `window.NatsFlow`
   (base component + PascalCase animated components + a nested `scenarios`
   map of static scenarios), then fires a `natsflow-loaded` event
3. **Loader** (`/static/js/nats-flow-loader.js`): finds uninitialized
   `.nats-flow` divs and renders them — a `data-scenario` ending in
   `Animated` auto-resolves to the PascalCase component (the loader never
   needs edits for new scenarios); anything else looks up the static
   `scenarios` map. A MutationObserver re-runs on Docusaurus SPA navigation
4. **Build-time fallback** (`scripts/rehype-nats-flow.mjs`): replaces each
   div in the markdown/LLM output with a titled prose description + edge
   list, from the scenario's `description` or its `FALLBACKS`/`TITLES`
   entries (build warns when neither exists)

`src/types/global.d.ts` mirrors the `window.NatsFlow` shape by convention
but is not typecheck-enforced — keep it in sync when registering scenarios.

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

The component uses Tailwind CSS classes for styling. Animated scenarios use
the NATS brand colors (see CLAUDE.md):

- Primary Blue: `#27AAE1`
- Navy: `#375C93`
- Green: `#34A574`
- Lime: `#8DC63F`

## Development

### Testing Locally

1. Start the dev server:
```bash
cd nats.docs.v2
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
