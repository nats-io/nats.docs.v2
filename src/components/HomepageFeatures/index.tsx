import type {ComponentType, CSSProperties, ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import {
  RocketIcon,
  LightbulbIcon,
  LearnIcon,
  TutorialsIcon,
  ReferenceIcon,
  UsersIcon,
} from '@site/src/components/Icons';
import type {IconProps} from '@site/src/components/Icons';
import styles from './styles.module.css';

type DocSection = {
  title: string;
  Icon: ComponentType<IconProps>;
  description: ReactNode;
  link: string;
  accent: string;
};

const DocSections: DocSection[] = [
  {
    title: 'Getting Started',
    Icon: RocketIcon,
    accent: '#27AAE1',
    description: (
      <>
        New to NATS? Start here to learn the basics and get your first application running in minutes.
      </>
    ),
    link: '/concepts/intro',
  },
  {
    title: 'Concepts',
    Icon: LightbulbIcon,
    accent: '#F59E0B',
    description: (
      <>
        Understand the core concepts and architecture behind NATS messaging patterns and JetStream.
      </>
    ),
    link: '/concepts/what-is-nats',
  },
  {
    title: 'Learn',
    Icon: LearnIcon,
    accent: '#8B5CF6',
    description: (
      <>
        Long-form deep dives into Core NATS, JetStream, and operating NATS in production.
      </>
    ),
    link: '/learn',
  },
  {
    title: 'Tutorials',
    Icon: TutorialsIcon,
    accent: '#34A574',
    description: (
      <>
        Hands-on tutorials to help you learn by building real-world applications with NATS.
      </>
    ),
    link: '/tutorials',
  },
  {
    title: 'Reference',
    Icon: ReferenceIcon,
    accent: '#375C93',
    description: (
      <>
        Complete reference documentation for server configuration, protocol details, and API specifications.
      </>
    ),
    link: '/reference',
  },
  {
    title: 'Community',
    Icon: UsersIcon,
    accent: '#EC4899',
    description: (
      <>
        Join the NATS community on Slack, contribute on GitHub, or get help from fellow developers.
      </>
    ),
    link: 'https://nats.io/community/',
  },
];

function DocSectionCard({title, Icon, description, link, accent}: DocSection) {
  const isExternal = link.startsWith('http');

  return (
    <div className={clsx('col col--4', styles.docSection)}>
      <Link to={link} className={styles.docSectionLink}>
        <div
          className={styles.docSectionCard}
          style={{['--card-accent' as string]: accent} as CSSProperties}
        >
          <div className={styles.docSectionIcon}>
            <Icon width={28} height={28} />
          </div>
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
