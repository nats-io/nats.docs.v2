package main

import (
	"fmt"
	"io"
	"sort"
	"strings"
)

// walkProperties visits every property in the resolved config, depth first,
// passing the dotted path it is reachable at. Nested object properties are
// visited after their parent.
func walkProperties(c *Config, fn func(path string, p *Property)) {
	var walkSections func(prefix string, sections []*Section)
	walkSections = func(prefix string, sections []*Section) {
		for _, s := range sections {
			for _, p := range s.Properties {
				path := p.Name
				if prefix != "" {
					path = prefix + "." + p.Name
				}
				fn(path, p)
				for _, o := range p.Types {
					if len(o.Sections) > 0 {
						walkSections(path, o.Sections)
					}
				}
			}
		}
	}
	walkSections("", c.Sections)
}

// CountProperties returns the number of property pages the config resolves to.
func CountProperties(c *Config) int {
	var n int
	walkProperties(c, func(string, *Property) { n++ })
	return n
}

// UnsetReloadPaths returns the dotted paths of properties with no reload
// verdict, sorted. These render no badge, which is honest but should be
// visible to whoever runs the generator.
func UnsetReloadPaths(c *Config) []string {
	var out []string
	walkProperties(c, func(path string, p *Property) {
		if p.Reloadable == ReloadUnset {
			out = append(out, path)
		}
	})
	sort.Strings(out)
	return out
}

// WriteAudit dumps one row per resolved property page as TSV. It exists to make
// the backfill tractable: the audit data is keyed by rendered page path, but the
// spec is authored by type, and the mapping is many-to-one. Joining this dump
// against the audit findings shows which shared types resolve to conflicting
// verdicts across their reference sites, and therefore need specialising before
// any annotation is written.
func WriteAudit(w io.Writer, c *Config) error {
	if _, err := fmt.Fprintln(w, strings.Join([]string{
		"path", "source_type", "reloadable", "note", "version", "removed", "types",
	}, "\t")); err != nil {
		return err
	}

	var rows []string
	walkProperties(c, func(path string, p *Property) {
		rel := "-"
		if p.Reloadable != ReloadUnset {
			rel = string(p.Reloadable)
		}
		var types []string
		for _, o := range p.Types {
			types = append(types, o.Type)
		}
		rows = append(rows, strings.Join([]string{
			path,
			p.Source,
			rel,
			strings.Join(strings.Fields(p.ReloadableNote), " "),
			p.Version,
			p.Removed,
			strings.Join(types, "|"),
		}, "\t"))
	})
	sort.Strings(rows)

	for _, r := range rows {
		if _, err := fmt.Fprintln(w, r); err != nil {
			return err
		}
	}
	return nil
}
