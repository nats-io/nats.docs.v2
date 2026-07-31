package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	var (
		configYaml    string
		typesDir      string
		genMarkdown   bool
		dirName       string
		basePath      string
		useRelative   bool
		indexFilename string
		trimIndex     bool
		sidebarFile   string
		version       string
		knownVersions string
		strict        bool
		auditOut      bool
	)

	flag.StringVar(&configYaml, "config", "config.yaml", "The root config YAML file.")
	flag.StringVar(&typesDir, "types", "types", "The path to the types directory.")

	// Markdown options
	flag.BoolVar(&genMarkdown, "markdown", false, "Generate markdown files for the reference docs.")
	flag.StringVar(&dirName, "dir", "reference", "The output directory for the reference docs.")
	flag.StringVar(&basePath, "base", "/reference/config", "Base URL path for the ref document paths.")
	flag.BoolVar(&useRelative, "relative", false, "Use relative paths for the links.")
	flag.StringVar(&indexFilename, "indexname", "index.md", "The index filename for a directory.")
	flag.BoolVar(&trimIndex, "trimindex", false, "Trim the index filename from the URL path.")
	flag.StringVar(&sidebarFile, "sidebar", "config-sidebar.json", "The sidebar file to output to.")

	// Version awareness. Both are optional: with no -version the whole spec is
	// rendered using each property's unkeyed values, which keeps `go run .`
	// useful for local iteration.
	flag.StringVar(&version, "version", "", "The server minor version to render, e.g. 2.12.")
	flag.StringVar(&knownVersions, "known", "", "Comma-separated list of live doc versions, e.g. 2.11,2.12,2.14.")
	flag.BoolVar(&strict, "strict", false, "Exit non-zero if any property has no reloadable verdict.")
	flag.BoolVar(&auditOut, "audit", false, "Write a TSV of path/type/verdict to stdout instead of generating docs.")

	flag.Parse()

	var known []string
	for _, v := range strings.Split(knownVersions, ",") {
		if v = strings.TrimSpace(v); v != "" {
			known = append(known, v)
		}
	}

	var paths []string
	entries, err := os.ReadDir(typesDir)
	if err != nil {
		return fmt.Errorf("read dir: %w", err)
	}
	for _, e := range entries {
		paths = append(paths, filepath.Join(typesDir, e.Name()))
	}

	c, err := Parse(configYaml, paths, ParseOptions{
		Version:       version,
		KnownVersions: known,
	})
	if err != nil {
		return err
	}

	if auditOut {
		return WriteAudit(os.Stdout, c)
	}

	// Report reload coverage on every run. Publishing a page with no verdict is
	// the honest default, but it should never be invisible. An explicit
	// `unverified` counts as covered: someone looked and concluded there is
	// nothing to assert, which is not the same as nobody having looked.
	unset := UnsetReloadPaths(c)
	total := CountProperties(c)
	if len(unset) > 0 {
		fmt.Fprintf(os.Stderr, "reload coverage: %d/%d properties have a verdict; %d missing\n",
			total-len(unset), total, len(unset))
		limit := len(unset)
		if limit > 20 {
			limit = 20
		}
		for _, p := range unset[:limit] {
			fmt.Fprintf(os.Stderr, "  no reloadable verdict: %s\n", p)
		}
		if len(unset) > limit {
			fmt.Fprintf(os.Stderr, "  ... and %d more\n", len(unset)-limit)
		}
		if strict {
			return fmt.Errorf("%d properties have no reloadable verdict (-strict)", len(unset))
		}
	}

	switch {
	case genMarkdown:
		mc := MarkdownConfig{
			BasePath:      basePath,
			RelativeLinks: useRelative,
			IndexName:     indexFilename,
			TrimIndexFile: trimIndex,
			SidebarFile:   sidebarFile,
			OldestLive:    c.OldestLive,
		}

		return GenerateMarkdown(c, dirName, &mc)

	default:
		return fmt.Errorf("no output format specified")
	}
}
