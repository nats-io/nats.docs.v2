import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import type { Options as DocsOptions } from "@docusaurus/plugin-content-docs";
import natsFlowPlugin from "./src/plugins/nats-flow";
import docVersions from "./scripts/doc-versions.json";
import rehypeNatsExample from "./scripts/rehype-nats-example.mjs";
import rehypeNatsFlow from "./scripts/rehype-nats-flow.mjs";
import rehypeFlattenTabs from "./scripts/rehype-flatten-tabs.mjs";
import rehypeStripHeadingAnchors from "./scripts/rehype-strip-heading-anchors.mjs";

// Build the versions config for the 'reference' docs plugin instance from
// scripts/doc-versions.json — single source of truth for NATS-version →
// {nats-server tag, jsm.go tag, status} mapping.
//
// status semantics:
//   'latest'       — served at /reference/... (no version path prefix),
//                     drives lastVersion
//   'maintained'   — older but still supported; no banner
//   'unmaintained' — shows the Docusaurus 'unmaintained' banner
// Rehype plugins shared by every docs pipeline (preset-classic docs,
// reference docs, llms-txt). Each pipeline re-uses the same plugin
// instances; module-level caches inside the plugins are shared too.
const SHARED_REHYPE_PLUGINS = [rehypeNatsExample, rehypeNatsFlow];

// Base for "Edit this page" links. Docusaurus appends the instance's content
// dir (docs/, learn/, tutorials/) plus the doc path, so one base serves all
// instances. The versioned 'reference' instance deliberately has no editUrl:
// its pages are generated from nats-server/jsm.go and must not be hand-edited.
const EDIT_URL = "https://github.com/nats-io/nats.docs.v2/edit/main/";

const referenceVersions: DocsOptions["versions"] = Object.fromEntries(
  docVersions.versions.map((v) => [
    v.name,
    {
      label: v.status === "latest" ? `${v.name} (latest)` : v.name,
      path: v.status === "latest" ? "" : v.name,
      // Docusaurus defaults every version below lastVersion to the
      // 'unmaintained' banner, so 'maintained' must opt out explicitly.
      banner: v.status === "unmaintained" ? ("unmaintained" as const) : ("none" as const),
    },
  ]),
);

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "NATS Documentation",
  tagline: "Connective Technology for Adaptive Edge & Distributed Systems",
  favicon: "favicon.ico",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Global scripts
  scripts: [
    {
      src: '/js/nats-flow-loader.js',
      defer: true,
      type: 'module',
    }
  ],

  plugins: [
    [
      "@signalwire/docusaurus-plugin-llms-txt",
      {
        depth: 5,
        siteTitle: "NATS Documentation",
        siteDescription:
          "Connective Technology for Adaptive Edge & Distributed Systems — official NATS messaging documentation.",
        includeOrder: [
          "concepts/**",
          "tutorials/**",
          "reference/**",
        ],
        content: {
          enableLlmsFullTxt: true,
          enableMarkdownFiles: true,
          includeVersionedDocs: false,
          beforeDefaultRehypePlugins: [
            ...SHARED_REHYPE_PLUGINS,
            rehypeFlattenTabs,
            rehypeStripHeadingAnchors,
          ],
        },
      },
    ],
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        hashed: true,
        indexBlog: false,
        docsRouteBasePath: ["/", "reference"],
        docsDir: ["docs", "docs-reference"],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
    natsFlowPlugin,
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "reference",
        path: "docs-reference",
        routeBasePath: "reference",
        sidebarPath: "./sidebars-reference.ts",
        // Reference content is always pinned to a released NATS major.
        // The 'current' folder (docs-reference/) is a placeholder — never
        // rendered. Cut a new version by running generate-version.js and
        // adding an entry to scripts/doc-versions.json.
        includeCurrentVersion: false,
        lastVersion: docVersions.latest,
        versions: referenceVersions,
        beforeDefaultRehypePlugins: SHARED_REHYPE_PLUGINS,
      } satisfies DocsOptions,
    ],
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "learn",
        path: "learn",
        routeBasePath: "learn",
        sidebarPath: "./sidebars-learn.ts",
        // Long-form deep dives. Unversioned — concepts only; version-bound
        // behavior is linked out to the versioned 'reference' instance.
        includeCurrentVersion: true,
        editUrl: EDIT_URL,
        beforeDefaultRehypePlugins: SHARED_REHYPE_PLUGINS,
      } satisfies DocsOptions,
    ],
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "tutorials",
        path: "tutorials",
        routeBasePath: "tutorials",
        sidebarPath: "./sidebars-tutorials.ts",
        // Learning-oriented, hand-held walkthroughs (Diataxis tutorials).
        // Unversioned; each tutorial hands off to the versioned reference and
        // the Learn deep dives for the "why".
        includeCurrentVersion: true,
        editUrl: EDIT_URL,
        beforeDefaultRehypePlugins: SHARED_REHYPE_PLUGINS,
      } satisfies DocsOptions,
    ],
  ],

  // Set the production url of your site here
  url: "https://docs.nats.io",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "nats-io", // Usually your GitHub org/user name.
  projectName: "nats.docs.v2", // Usually your repo name.

  onBrokenLinks: "warn", // Changed from "throw" to allow production build

  markdown: {
    hooks: {
      // Migrated from the deprecated top-level `onBrokenMarkdownLinks`.
      onBrokenMarkdownLinks: "warn",
    },
    // `future.v4: true` disables MDX-1 compat by default, which turns off the
    // explicit `{#heading-id}` syntax. Keep just that one compat behavior on
    // so existing heading anchors (e.g. ecosystem.md's #tier-1-clients) work.
    mdx1Compat: {
      headingIds: true,
    },
  },

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "",
          sidebarPath: "./sidebars.ts",
          beforeDefaultRehypePlugins: SHARED_REHYPE_PLUGINS,
          editUrl: EDIT_URL,
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // NATS social card for sharing
    image: "img/nats-social-card.png",
    metadata: [
      {
        name: "keywords",
        content:
          "nats, messaging, pubsub, cloud native, microservices, iot, edge",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "og:image", content: "/img/nats-social-card.png" },
    ],
    navbar: {
      title: "",
      logo: {
        alt: "NATS Logo",
        src: "img/nats-logo.svg",
        srcDark: "img/nats-logo-dark.svg",
        width: 100,
        height: 32,
      },
      items: [
        {
          type: "custom-docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Concepts",
          href: "/concepts/intro/",
        },
        {
          type: "custom-docSidebar",
          sidebarId: "learnSidebar",
          position: "left",
          label: "Learn",
          href: "/learn/",
        },
        {
          type: "custom-docSidebar",
          sidebarId: "tutorialsSidebar",
          position: "left",
          label: "Tutorials",
          href: "/tutorials/",
        },
        {
          type: "custom-docSidebar",
          sidebarId: "referenceSidebar",
          position: "left",
          label: "Reference",
          href: "/reference/",
        },
        {
          type: "custom-docSidebar",
          sidebarId: "releaseNotesSidebar",
          position: "left",
          label: "Release Notes",
          href: "/release-notes/",
        },
        {
          type: "docsVersionDropdown",
          docsPluginId: "reference",
          position: "right",
          // Renders on every page (stock component; it is not scoped to
          // reference routes). Versions come from scripts/doc-versions.json;
          // labels from referenceVersions above.
          dropdownItemsBefore: [
            { to: "/release-notes/", label: "Release notes" },
          ],
        },
        {
          href: "https://github.com/nats-io",
          label: "GitHub",
          position: "right",
        },
        {
          href: "https://slack.nats.io",
          label: "Slack",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            {
              label: "Concepts",
              to: "/concepts/intro",
            },
            {
              label: "Learn",
              to: "/learn/",
            },
            {
              label: "Tutorials",
              to: "/tutorials",
            },
            {
              label: "Reference",
              to: "/reference/",
            },
            {
              label: "Release Notes",
              to: "/release-notes/",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Slack",
              href: "https://slack.nats.io",
            },
            {
              label: "Twitter",
              href: "https://twitter.com/nats_io",
            },
            {
              label: "Google Groups",
              href: "https://groups.google.com/forum/#!forum/natsio",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/nats-io",
            },
            {
              label: "Contribute to these docs",
              href: "https://github.com/nats-io/nats.docs.v2",
            },
            {
              label: "NATS.io",
              href: "https://nats.io",
            },
            {
              label: "NATS by Example",
              href: "https://natsbyexample.com",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Synadia Communications, Inc. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['bash', 'go', 'rust', 'java', 'csharp'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
