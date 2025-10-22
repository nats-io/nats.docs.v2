import React from 'react';
import { NatsFlow } from './NatsFlow';
import {
  publishSubscribeScenario,
  requestReplyScenario,
  fanOutScenario,
  queueGroupScenario,
} from './scenarios';

/**
 * Showcase component displaying all built-in scenarios
 * Useful for testing and as a reference implementation
 *
 * To use in a docs page, create an MDX file with:
 *
 * import { Showcase } from '@site/src/components/NatsFlow/Showcase';
 * <Showcase />
 */
export const Showcase: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <h2>Publish/Subscribe Pattern</h2>
        <p>
          One publisher sends messages to multiple subscribers. All subscribers
          receive every message published to the subject they're subscribed to.
        </p>
        <NatsFlow scenario={publishSubscribeScenario} />
      </div>

      <div>
        <h2>Request/Reply Pattern</h2>
        <p>
          A client sends a request and waits for a reply. The service processes
          the request and sends back a response.
        </p>
        <NatsFlow scenario={requestReplyScenario} />
      </div>

      <div>
        <h2>Fan-out Pattern</h2>
        <p>
          Messages are distributed to many subscribers simultaneously, enabling
          parallel processing and real-time updates.
        </p>
        <NatsFlow scenario={fanOutScenario} height={450} />
      </div>

      <div>
        <h2>Queue Groups (Load Balancing)</h2>
        <p>
          Multiple workers in a queue group share the workload. Each message is
          delivered to only one worker, enabling horizontal scaling.
        </p>
        <NatsFlow scenario={queueGroupScenario} />
      </div>
    </div>
  );
};
