import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Placeholder sidebar for the 'reference' docs plugin instance.
 *
 * With `includeCurrentVersion: false` in docusaurus.config.ts, Docusaurus
 * never renders this sidebar — each version under
 * reference_versioned_sidebars/version-<name>-sidebars.json is authoritative
 * instead. The file still needs to exist because `sidebarPath` is required
 * in the plugin config.
 *
 * The versioned sidebars are built by scripts/generate-version.js from a
 * fixed template + the config-generator's sidebar fragment.
 */
const sidebars: SidebarsConfig = {
  referenceSidebar: [],
};

export default sidebars;
