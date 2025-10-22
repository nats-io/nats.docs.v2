import React from 'react';
import type { Scenario, ControlButton } from './types';
import { NodeComponent } from './NodeComponent';
import { MessageComponent } from './MessageComponent';
import { ArrowComponent } from './ArrowComponent';
import { ControlPanel } from './ControlPanel';
import { useAnimationEngine } from './useAnimationEngine';
import styles from './NatsFlow.module.css';

interface NatsFlowProps {
  scenario: Scenario;
  customButtons?: ControlButton[];
  width?: number;
  height?: number;
  showDefaultControls?: boolean;
  debug?: boolean;
}

export const NatsFlow: React.FC<NatsFlowProps> = ({
  scenario,
  customButtons = [],
  width = 800,
  height = 400,
  showDefaultControls = true,
  debug = false,
}) => {
  const { messages, highlightedNodes, isPlaying, play, pause, reset, toggle, currentStep } =
    useAnimationEngine(scenario);

  const defaultButtons: ControlButton[] = [
    {
      label: isPlaying ? 'Pause' : 'Play',
      action: toggle,
      variant: 'primary',
      icon: isPlaying ? '⏸️' : '▶️',
    },
    {
      label: 'Reset',
      action: reset,
      variant: 'secondary',
      icon: '🔄',
    },
  ];

  const allButtons = showDefaultControls
    ? [...defaultButtons, ...customButtons]
    : customButtons;

  const nodesById = new Map(scenario.nodes.map((node) => [node.id, node]));

  return (
    <div className={styles.container}>
      <div
        className={styles.canvas}
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        {/* Render connections/arrows */}
        {scenario.connections.map((connection, index) => {
          const fromNode = nodesById.get(connection.from);
          const toNode = nodesById.get(connection.to);
          if (!fromNode || !toNode) return null;

          return (
            <ArrowComponent
              key={`arrow-${index}`}
              connection={connection}
              fromNode={fromNode}
              toNode={toNode}
            />
          );
        })}

        {/* Render nodes */}
        {scenario.nodes.map((node) => (
          <NodeComponent
            key={node.id}
            node={node}
            highlighted={highlightedNodes.has(node.id)}
          />
        ))}

        {/* Render messages */}
        {messages.map((message) => {
          const fromNode = nodesById.get(message.from);
          const toNode = nodesById.get(message.to[0]);
          if (!fromNode || !toNode) return null;

          return (
            <MessageComponent
              key={message.id}
              message={message}
              fromNode={fromNode}
              toNode={toNode}
            />
          );
        })}

        {/* Debug overlay */}
        {debug && (
          <div className={styles.debugOverlay}>
            <div className={styles.debugPanel}>
              <h4>Debug Info</h4>
              <div>Playing: {isPlaying ? '▶️ YES' : '⏸️ NO'}</div>
              <div>Current Step: {currentStep} / {scenario.steps.length}</div>
              <div>Active Messages: {messages.length}</div>
              <div>Highlighted Nodes: {highlightedNodes.size}</div>
              <div className={styles.debugMessages}>
                <strong>Messages:</strong>
                {messages.map((msg) => (
                  <div key={msg.id} className={styles.debugMessage}>
                    {msg.subject}: {msg.from} → {msg.to[0]}<br />
                    Progress: {(msg.progress * 100).toFixed(1)}% | Duration: {msg.duration}ms
                  </div>
                ))}
              </div>
              {scenario.steps[currentStep] && (
                <div className={styles.debugStep}>
                  <strong>Current Step:</strong>
                  <pre>{JSON.stringify(scenario.steps[currentStep], null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ControlPanel
        buttons={allButtons}
        title={scenario.title}
        description={scenario.description}
      />
    </div>
  );
};
