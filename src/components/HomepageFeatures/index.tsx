import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  emoji: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'High Performance',
    emoji: '🚀',
    description: (
      <>
        Process millions of messages per second with sub-millisecond latency.
        NATS is designed for speed and efficiency at any scale.
      </>
    ),
  },
  {
    title: 'Cloud Native',
    emoji: '☁️',
    description: (
      <>
        Built for modern distributed systems. Deploy anywhere - cloud, on-premise,
        edge, or IoT devices. One technology, infinite possibilities.
      </>
    ),
  },
  {
    title: 'Simple & Secure',
    emoji: '🔒',
    description: (
      <>
        Easy to understand, easy to deploy. Security built-in with TLS,
        authentication, and authorization. No complex configuration required.
      </>
    ),
  },
];

function Feature({title, emoji, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <div className={styles.featureEmoji}>{emoji}</div>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}