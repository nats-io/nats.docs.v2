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
const referenceVersions: DocsOptions["versions"] = Object.fromEntries(
  docVersions.versions.map((v) => [
    v.name,
    {
      label: v.status === "latest" ? `${v.name} (latest)` : v.name,
      path: v.status === "latest" ? "" : v.name,
      ...(v.status === "unmaintained" ? { banner: "unmaintained" as const } : {}),
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
      src: '/js/nats-example-loader-v2.js',
      defer: true,
    },
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
          "intro/**",
          "what-is-nats/**",
          "getting-started/**",
          "concepts/**",
          "guides/**",
          "tutorials/**",
          "reference/**",
        ],
        content: {
          enableLlmsFullTxt: true,
          enableMarkdownFiles: true,
          includeVersionedDocs: false,
          beforeDefaultRehypePlugins: [
            rehypeNatsExample,
            rehypeNatsFlow,
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
  projectName: "nats.docs", // Usually your repo name.

  onBrokenLinks: "warn", // Changed from "throw" to allow production build

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    }
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
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          // editUrl:
          // "https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/",
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
          label: "Docs",
          href: "/intro/",
        },
        {
          type: "custom-docSidebar",
          sidebarId: "guidesSidebar",
          position: "left",
          label: "Guides",
          href: "/guides/",
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
          type: "docsVersionDropdown",
          docsPluginId: "reference",
          position: "right",
          // Only appears when user is on a reference page. Versions come
          // from scripts/doc-versions.json; labels from referenceVersions above.
        },
        {
          href: "https://github.com/nats-io",
          label: "GitHub",
          position: "right",
        },
        {
          href: "https://natsio.slack.com",
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
              label: "Intro",
              to: "/intro",
            },
            {
              label: "Tutorials",
              to: "/tutorials",
            },
            {
              label: "Guides",
              to: "/guides",
            },
            {
              label: "Reference",
              to: "/reference",
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
      copyright: `Copyright © ${new Date().getFullYear()} The NATS Authors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['bash', 'go', 'rust', 'java', 'csharp'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
