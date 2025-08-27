import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero", styles.heroBanner)}>
      <div className="container">
        <img
          src="/img/nats-icon.svg"
          alt="NATS Logo"
          className={styles.heroLogo}
        />
        <h1 className={clsx("hero__title", styles.heroTitle)}>
          {siteConfig.title}
        </h1>
        <p className={clsx("hero__subtitle", styles.heroSubtitle)}>
          {siteConfig.tagline}
        </p>
        <div className={styles.heroStats}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>10M+</span>
            <span className={styles.statLabel}>Messages/Second</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>&lt;1ms</span>
            <span className={styles.statLabel}>Latency</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>~18MB</span>
            <span className={styles.statLabel}>Binary Size</span>
          </div>
        </div>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/intro"
            style={{ cursor: "pointer" }}
          >
            Get Started with NATS
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/concepts/what-is-nats"
            style={{ cursor: "pointer", marginLeft: "1rem" }}
          >
            Learn More
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): React.JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Welcome to ${siteConfig.title}`}
      description="NATS is a simple, secure and high-performance open source messaging system for cloud native applications, IoT messaging, and microservices architectures."
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <section className={styles.trustedBy}>
          <div className="container">
            <h2>Trusted by Industry Leaders</h2>
            <p className={styles.trustedByText}>
              NATS is used in production by thousands of companies worldwide
            </p>
          </div>
        </section>
      </main>
    </Layout>
  );
}

