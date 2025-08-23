package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
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

	flag.Parse()

	var paths []string
	entries, err := os.ReadDir(typesDir)
	if err != nil {
		return fmt.Errorf("read dir: %w", err)
	}
	for _, e := range entries {
		paths = append(paths, filepath.Join(typesDir, e.Name()))
	}

	c, err := Parse(configYaml, paths)
	if err != nil {
		return err
	}

	switch {
	case genMarkdown:
		mc := MarkdownConfig{
			BasePath:      basePath,
			RelativeLinks: useRelative,
			IndexName:     indexFilename,
			TrimIndexFile: trimIndex,
			SidebarFile:   sidebarFile,
		}

		return GenerateMarkdown(c, dirName, &mc)

	default:
		return fmt.Errorf("no output format specified")
	}
}
