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
          Welcome to NATS Documentation
        </h1>
        <p className={clsx("hero__subtitle", styles.heroSubtitle)}>
          Everything you need to build with NATS - a simple, secure, and high-performance messaging system
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/concepts/intro"
          >
            Get Started
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/concepts/what-is-nats"
          >
            Learn Concepts
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
      title={`NATS Documentation`}
      description="Complete documentation for NATS - a simple, secure and high-performance open source messaging system for cloud native applications, IoT messaging, and microservices architectures."
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}

