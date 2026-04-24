import React, { type ReactNode, useState } from 'react';
import OriginalDocItemFooter from '@theme-original/DocItem/Footer';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

function mdUrlFor(permalink: string, baseUrl: string): string {
  const withBase = permalink.startsWith(baseUrl)
    ? permalink
    : baseUrl.replace(/\/$/, '') + permalink;
  const noTrailingSlash = withBase.endsWith('/') ? withBase.slice(0, -1) : withBase;
  return noTrailingSlash + '.md';
}

function absoluteMdUrl(relativeMdPath: string, siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, '');
  return base + relativeMdPath;
}

export default function DocItemFooterWrapper(): ReactNode {
  const { metadata } = useDoc();
  const { siteConfig } = useDocusaurusContext();
  const { permalink } = metadata;
  const { url: siteUrl, baseUrl } = siteConfig;

  const mdPath = mdUrlFor(permalink, baseUrl);
  const absoluteUrl = absoluteMdUrl(mdPath, siteUrl);
  const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(
    `Read the NATS documentation page at ${absoluteUrl} and help me with it.`,
  )}`;

  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const onCopy = async () => {
    try {
      const res = await fetch(mdPath);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (err) {
      console.error('Copy as Markdown failed:', err);
      setCopyState('failed');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          margin: '1.5rem 0 0.5rem',
        }}
      >
        <button
          type="button"
          onClick={onCopy}
          className="button button--secondary button--sm"
          aria-label="Copy this page as Markdown"
        >
          {copyState === 'copied'
            ? 'Copied!'
            : copyState === 'failed'
              ? 'Failed'
              : 'Copy as Markdown'}
        </button>
        <a
          href={mdPath}
          target="_blank"
          rel="noopener noreferrer"
          className="button button--secondary button--sm"
        >
          View as Markdown
        </a>
        <a
          href={claudeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button button--secondary button--sm"
        >
          Open in Claude
        </a>
      </div>
      <OriginalDocItemFooter />
    </>
  );
}
