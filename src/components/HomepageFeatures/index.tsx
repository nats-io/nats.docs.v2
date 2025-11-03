import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

type DocSection = {
  title: string;
  emoji: string;
  description: ReactNode;
  link: string;
};

const DocSections: DocSection[] = [
  {
    title: 'Getting Started',
    emoji: '🚀',
    description: (
      <>
        New to NATS? Start here to learn the basics and get your first application running in minutes.
      </>
    ),
    link: '/intro',
  },
  {
    title: 'Concepts',
    emoji: '💡',
    description: (
      <>
        Understand the core concepts and architecture behind NATS messaging patterns and JetStream.
      </>
    ),
    link: '/concepts/what-is-nats',
  },
  {
    title: 'Guides',
    emoji: '📖',
    description: (
      <>
        Step-by-step guides for common tasks and patterns when building with NATS.
      </>
    ),
    link: '/guides',
  },
  {
    title: 'Tutorials',
    emoji: '🎓',
    description: (
      <>
        Hands-on tutorials to help you learn by building real-world applications with NATS.
      </>
    ),
    link: '/tutorials',
  },
  {
    title: 'Reference',
    emoji: '📚',
    description: (
      <>
        Complete reference documentation for server configuration, protocol details, and API specifications.
      </>
    ),
    link: '/reference',
  },
  {
    title: 'Community',
    emoji: '👥',
    description: (
      <>
        Join the NATS community on Slack, contribute on GitHub, or get help from fellow developers.
      </>
    ),
    link: 'https://nats.io/community/',
  },
];

function DocSectionCard({title, emoji, description, link}: DocSection) {
  const isExternal = link.startsWith('http');

  return (
    <div className={clsx('col col--4', styles.docSection)}>
      <Link to={link} className={styles.docSectionLink}>
        <div className={styles.docSectionCard}>
          <div className={styles.docSectionEmoji}>{emoji}</div>
          <Heading as="h3" className={styles.docSectionTitle}>{title}</Heading>
          <p className={styles.docSectionDescription}>{description}</p>
          <div className={styles.docSectionArrow}>
            {isExternal ? '↗' : '→'}
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2">Explore the Documentation</Heading>
          <p>Find everything you need to build with NATS</p>
        </div>
        <div className="row">
          {DocSections.map((props, idx) => (
            <DocSectionCard key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}