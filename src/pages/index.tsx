import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
import HeroNet from "@site/src/components/HeroNet";
import HeroSystem from "@site/src/components/HeroSystem";
import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={styles.heroBanner}>
      <HeroNet />
      <div className={`container ${styles.heroInner}`}>
        <div>
          <h1 className={styles.heroTitle}>
            Welcome to NATS Documentation
          </h1>
          <p className={styles.heroSubtitle}>
            Everything you need to build with NATS - a simple, secure, and high-performance messaging system
          </p>
        </div>
        <HeroSystem />
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

