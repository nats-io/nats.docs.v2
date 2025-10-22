# NatsFlow - Interactive Message Flow Animation Framework

A comprehensive, easy-to-use framework for creating interactive message flow animations in your NATS documentation. Built with React and TypeScript, designed specifically for Docusaurus.

## Features

- **Reusable Components**: Pre-built server, client, publisher, and subscriber nodes
- **Smooth Animations**: CSS-powered animations with configurable timing
- **Interactive Controls**: Play/pause, reset, and custom action buttons
- **Flexible Scenarios**: Easy-to-define animation sequences
- **Dark Mode Support**: Automatically adapts to Docusaurus theme
- **TypeScript**: Full type safety and IntelliSense support

## Quick Start

### Basic Usage

```tsx
import { NatsFlow } from '@site/src/components/NatsFlow';
import { publishSubscribeScenario } from '@site/src/components/NatsFlow/scenarios';

// In your MDX file
<NatsFlow scenario={publishSubscribeScenario} />
```

### Pre-built Scenarios

The framework comes with several ready-to-use scenarios:

- `publishSubscribeScenario` - Basic pub/sub pattern
- `requestReplyScenario` - Request/reply pattern
- `fanOutScenario` - One-to-many distribution
- `queueGroupScenario` - Load balancing across workers

## Creating Custom Scenarios

A scenario consists of:
1. **Nodes** - The visual elements (servers, clients, etc.)
2. **Connections** - Arrows showing relationships
3. **Steps** - The animation sequence

### Example: Simple Custom Scenario

```tsx
import { NatsFlow } from '@site/src/components/NatsFlow';
import type { Scenario } from '@site/src/components/NatsFlow';

const myScenario: Scenario = {
  title: 'My Custom Pattern',
  description: 'A simple demonstration',

  // Define the nodes
  nodes: [
    {
      id: 'pub',
      type: 'publisher',
      position: { x: 100, y: 180 },
      label: 'Publisher',
    },
    {
      id: 'server',
      type: 'server',
      position: { x: 360, y: 180 },
      label: 'NATS Server',
    },
    {
      id: 'sub',
      type: 'subscriber',
      position: { x: 620, y: 180 },
      label: 'Subscriber',
    },
  ],

  // Define the connections (arrows)
  connections: [
    { from: 'pub', to: 'server' },
    { from: 'server', to: 'sub' },
  ],

  // Define the animation steps
  steps: [
    {
      type: 'publish',
      from: 'pub',
      to: 'server',
      subject: 'hello.world',
      duration: 1200,
      color: '#34A574',
    },
    {
      type: 'publish',
      from: 'server',
      to: 'sub',
      subject: 'hello.world',
      duration: 1200,
      color: '#34A574',
    },
    {
      type: 'pause',
      duration: 1000,
    },
  ],

  loop: true, // Automatically restart when complete
};

export const MyDemo = () => <NatsFlow scenario={myScenario} />;
```

## Node Types

Four node types are available, each with a distinct icon and color:

| Type | Icon | Color | Use Case |
|------|------|-------|----------|
| `server` | 🖥️ | Blue (#27AAE1) | NATS servers |
| `client` | 💻 | Navy (#375C93) | Generic clients |
| `publisher` | 📤 | Green (#34A574) | Message publishers |
| `subscriber` | 📥 | Lime (#8DC63F) | Message subscribers |

### Node Properties

```typescript
interface Node {
  id: string;              // Unique identifier
  type: NodeType;          // 'server' | 'client' | 'publisher' | 'subscriber'
  position: Position;      // { x: number, y: number }
  label?: string;          // Display label
  color?: string;          // Override default color
}
```

## Animation Steps

### Step Types

#### 1. Publish/Deliver
Sends a message from one node to another (or multiple nodes):

```typescript
{
  type: 'publish',
  from: 'publisher-id',
  to: 'server-id',           // Single recipient
  // OR
  to: ['sub1', 'sub2'],      // Multiple recipients
  subject: 'my.subject',
  payload: 'optional data',
  duration: 1200,            // milliseconds
  color: '#34A574',          // message color
}
```

#### 2. Request
Similar to publish, but semantically represents a request:

```typescript
{
  type: 'request',
  from: 'client-id',
  to: 'server-id',
  subject: 'api.call',
  duration: 1000,
}
```

#### 3. Pause
Adds a delay between steps:

```typescript
{
  type: 'pause',
  duration: 500,
}
```

## Custom Controls

Add custom buttons to control behavior:

```tsx
import type { ControlButton } from '@site/src/components/NatsFlow';

const customButtons: ControlButton[] = [
  {
    label: 'Send Burst',
    action: () => {
      // Your custom logic
    },
    variant: 'success',  // 'primary' | 'secondary' | 'success' | 'danger'
    icon: '⚡',
  },
];

<NatsFlow
  scenario={myScenario}
  customButtons={customButtons}
/>
```

## Advanced: Dynamic Scenarios

Create scenarios that change based on user interaction:

```tsx
import React, { useState } from 'react';
import { NatsFlow } from '@site/src/components/NatsFlow';
import type { Scenario, ControlButton } from '@site/src/components/NatsFlow';

export const DynamicDemo = () => {
  const [mode, setMode] = useState<'fast' | 'slow'>('fast');

  const scenario: Scenario = {
    title: `${mode === 'fast' ? 'Fast' : 'Slow'} Messages`,
    // ... generate scenario based on mode
    steps: [
      {
        type: 'publish',
        from: 'pub',
        to: 'server',
        subject: 'data',
        duration: mode === 'fast' ? 500 : 2000,
      },
      // ... more steps
    ],
  };

  const buttons: ControlButton[] = [
    {
      label: 'Toggle Speed',
      action: () => setMode(m => m === 'fast' ? 'slow' : 'fast'),
      variant: 'secondary',
    },
  ];

  return <NatsFlow scenario={scenario} customButtons={buttons} />;
};
```

## Configuration Options

### NatsFlow Props

```typescript
interface NatsFlowProps {
  scenario: Scenario;              // Required: The scenario to animate
  customButtons?: ControlButton[]; // Optional: Additional control buttons
  width?: number;                  // Canvas width (default: 800)
  height?: number;                 // Canvas height (default: 400)
  showDefaultControls?: boolean;   // Show play/pause/reset (default: true)
  debug?: boolean;                 // Show debug panel (default: false)
}
```

### Debug Mode

Enable debug mode to see real-time animation state:

```tsx
<NatsFlow scenario={myScenario} debug={true} />
```

The debug panel shows:
- Whether animation is playing
- Current step number and total steps
- Number of active messages
- Number of highlighted nodes
- Each message's progress percentage and duration
- Current step details in JSON format

This is extremely useful for:
- Troubleshooting animation timing
- Understanding message flow
- Developing new scenarios
- Performance testing

## Using in MDX

Import directly in your documentation:

```mdx
---
sidebar_position: 1
---

import { NatsFlow } from '@site/src/components/NatsFlow';
import { publishSubscribeScenario } from '@site/src/components/NatsFlow/scenarios';

# NATS Publish/Subscribe

Here's how publish/subscribe works in NATS:

<NatsFlow scenario={publishSubscribeScenario} />

The publisher sends messages to subjects, and all subscribers listening
to those subjects receive the messages.
```

## Styling

The framework automatically adapts to your Docusaurus theme (light/dark mode). All styles are contained in `NatsFlow.module.css`.

### Custom Styling

Override styles by wrapping in a custom div:

```tsx
<div className="my-custom-wrapper">
  <NatsFlow scenario={myScenario} />
</div>
```

Then add styles in your component's CSS:

```css
.my-custom-wrapper .nats-flow-container {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}
```

## Tips & Best Practices

1. **Positioning**: Use a canvas size (width/height) and position nodes thoughtfully
   - Standard canvas: 800x400
   - Leave margins: ~80px from edges
   - Center Y-axis: 180-200

2. **Timing**: Balance animation speed with readability
   - Message travel: 1000-1500ms
   - Pauses between steps: 500-1000ms

3. **Colors**: Use NATS brand colors for consistency
   - Blue: `#27AAE1`
   - Navy: `#375C93`
   - Green: `#34A574`
   - Lime: `#8DC63F`

4. **Complexity**: Start simple, add complexity gradually
   - 2-3 nodes for basic concepts
   - 4-6 nodes for intermediate patterns
   - Keep animation loops under 10 seconds

5. **Labels**: Keep node labels short (1-2 words)

## Examples Directory

Check out `src/components/NatsFlow/examples/` for complete working examples:

- `PubSubDemo.tsx` - Basic and advanced pub/sub demos
- `CustomScenarioDemo.tsx` - Dynamic scenario generation

## Architecture

```
NatsFlow/
├── types.ts                 # TypeScript type definitions
├── NatsFlow.tsx            # Main orchestrator component
├── NodeComponent.tsx       # Visual node renderer
├── MessageComponent.tsx    # Animated message renderer
├── ArrowComponent.tsx      # Connection arrow renderer
├── ControlPanel.tsx        # Button controls
├── useAnimationEngine.ts   # Animation state & logic
├── scenarios.ts            # Pre-built scenarios
├── NatsFlow.module.css     # All styles
├── examples/               # Example implementations
└── README.md              # This file
```

## Contributing

When adding new features:

1. Update types in `types.ts`
2. Add logic to `useAnimationEngine.ts` if needed
3. Update components as required
4. Add examples demonstrating the feature
5. Update this README

## Troubleshooting

**Messages not animating**: Ensure `duration` values are set in steps

**Nodes not showing**: Check that node `id` references in steps match node definitions

**Layout issues**: Verify `position` coordinates fit within canvas dimensions

**Dark mode issues**: Check that custom colors have sufficient contrast in both themes
