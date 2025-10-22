import { useState, useEffect, useRef, useCallback } from 'react';
import type { AnimationStep, Message, Scenario } from './types';

interface AnimationState {
  messages: Message[];
  currentStep: number;
  isPlaying: boolean;
  highlightedNodes: Set<string>;
  executingStep: boolean;
}

export const useAnimationEngine = (scenario: Scenario) => {
  const [state, setState] = useState<AnimationState>({
    messages: [],
    currentStep: 0,
    isPlaying: false,
    highlightedNodes: new Set(),
    executingStep: false,
  });

  const animationRef = useRef<number>();
  const messageIdCounter = useRef(0);

  const generateMessageId = () => {
    messageIdCounter.current += 1;
    return `msg-${messageIdCounter.current}`;
  };

  const updateMessages = useCallback((deltaTime: number) => {
    setState((prev) => {
      const updatedMessages = prev.messages
        .map((msg) => ({
          ...msg,
          // Calculate progress based on duration: deltaTime / duration
          progress: Math.min(1, msg.progress + deltaTime / msg.duration),
        }))
        .filter((msg) => msg.progress < 1);

      return { ...prev, messages: updatedMessages };
    });
  }, []);

  const executeStep = useCallback(
    (step: AnimationStep, currentMessages: Message[]) => {
      const duration = step.duration || 1500;

      if (step.type === 'pause') {
        setState((prev) => ({ ...prev, executingStep: true }));
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            currentStep: prev.currentStep + 1,
            executingStep: false,
          }));
        }, duration);
        return;
      }

      if (step.type === 'publish' || step.type === 'request') {
        const from = step.from!;
        const toArray = Array.isArray(step.to) ? step.to : [step.to!];

        // Create all messages at once
        const newMessages = toArray.map((to) => ({
          id: generateMessageId(),
          subject: step.subject || 'message',
          payload: step.payload,
          from,
          to: [to],
          progress: 0,
          duration: duration,
          color: step.color,
        }));

        // Update state once with all new messages
        setState((prev) => ({
          ...prev,
          highlightedNodes: new Set([from]),
          messages: [...currentMessages, ...newMessages],
          executingStep: true,
        }));

        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            highlightedNodes: new Set(),
            currentStep: prev.currentStep + 1,
            executingStep: false,
          }));
        }, duration);
      }

      if (step.type === 'deliver') {
        const toArray = Array.isArray(step.to) ? step.to : [step.to!];
        setState((prev) => ({
          ...prev,
          highlightedNodes: new Set(toArray),
          executingStep: true,
        }));

        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            highlightedNodes: new Set(),
            currentStep: prev.currentStep + 1,
            executingStep: false,
          }));
        }, duration);
      }
    },
    [generateMessageId]
  );

  useEffect(() => {
    if (!state.isPlaying) return;
    if (state.executingStep) return; // Don't start a new step if one is already executing

    const step = scenario.steps[state.currentStep];
    if (!step) {
      if (scenario.loop) {
        setState((prev) => ({ ...prev, currentStep: 0, messages: [] }));
      } else {
        setState((prev) => ({ ...prev, isPlaying: false }));
      }
      return;
    }

    executeStep(step, state.messages);
  }, [state.isPlaying, state.currentStep, state.executingStep, state.messages, scenario, executeStep]);

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') return;
    if (!state.isPlaying) return;

    let lastTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const deltaTime = now - lastTime;
      lastTime = now;

      updateMessages(deltaTime);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state.isPlaying, updateMessages]);

  const play = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const reset = useCallback(() => {
    setState({
      messages: [],
      currentStep: 0,
      isPlaying: false,
      highlightedNodes: new Set(),
      executingStep: false,
    });
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  return {
    messages: state.messages,
    highlightedNodes: state.highlightedNodes,
    isPlaying: state.isPlaying,
    currentStep: state.currentStep,
    play,
    pause,
    reset,
    toggle,
  };
};
