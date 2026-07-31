package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

type Link struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

type Sidebar struct {
	Type      string `json:"type"`
	Label     string `json:"label"`
	Collapsed bool   `json:"collapsed"`
	Link      *Link  `json:"link,omitempty"`
	Items     []any  `json:"items"`
}

type hierPath struct {
	Name string
	Path string
}

// reloadCell renders a property's reload verdict for a summary table. A
// starred value means the property page carries a caveat that does not fit in
// a cell; "-" means no verdict has been authored.
//
// "Ignored" is the short form of "Ignored Until Restart": the reload is
// accepted but the value does not take effect. It reads as a third answer in a
// column headed "Reloadable" rather than collapsing into Yes or No, both of
// which would mislead.
func reloadCell(r Reload, note string) string {
	var s string
	switch r {
	case ReloadYes:
		s = "Yes"
	case ReloadNo:
		s = "No"
	case ReloadNoop:
		s = "Ignored"
	default:
		return "-"
	}
	if note != "" {
		s += `\*`
	}
	return s
}

// mdxAttr flattens a value onto one line and escapes it for use as a
// double-quoted JSX string attribute.
func mdxAttr(s string) string {
	s = strings.Join(strings.Fields(s), " ")
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, `"`, "&quot;")
	return s
}

func hasNestedProps(p *Property) bool {
	for _, o := range p.Types {
		if o.Type == "object" {
			return true
		}
	}
	return false
}

func generateTemplate(w io.Writer, p *Property, mc *MarkdownConfig, hier []*hierPath) error {
	o := func(str string, args ...any) {
		fmt.Fprintf(w, str, args...)
	}

	o("# %s\n\n", p.Name)

	// Bare names: <Aliases> wraps each one in <code> itself, so backticks here
	// would render literally inside the code element.
	if len(p.Aliases) > 0 {
		o("<Aliases aliases=\"%s\" />\n", mdxAttr(strings.Join(p.Aliases, ", ")))
	}

	// "Since" is suppressed for anything that predates the oldest documented
	// version, because every live version has it. Without that suppression the
	// existing `version: 2.2` on the websocket type would print "Since 2.2" on
	// every websocket page.
	if p.Version != "" && (mc.OldestLive == "" || cmpVersion(p.Version, mc.OldestLive) > 0) {
		o("<Since version=\"%s\" />\n", mdxAttr(p.Version))
	}

	// A property with no authored verdict renders no badge — claiming
	// hot-reloadability we have not verified is worse than claiming nothing.
	// An authored note still renders on its own, so a caveat written without a
	// verdict is surfaced rather than silently dropped. Each of the three
	// states has exactly one spelling in the output.
	if p.Reloadable != ReloadUnset || p.ReloadableNote != "" {
		var attrs string
		if p.Reloadable != ReloadUnset {
			attrs = fmt.Sprintf(" state=%q", p.Reloadable)
		}
		if p.ReloadableNote != "" {
			attrs += fmt.Sprintf(" note=\"%s\"", mdxAttr(p.ReloadableNote))
		}
		o("<Reloadable%s />\n", attrs)
	}

	bpath := mc.BasePath
	if len(hier) > 0 {
		bpath = filepath.Join(hier[len(hier)-1].Path, p.Name)
	}

	if p.Deprecation != "" {
		o(`:::warning
**Deprecation Notice**
%s
:::
`, p.Deprecation)
	}

	if p.Description != "" {
		o("%s\n\n", p.Description)
	}

	o("\n")

	if len(p.Types) == 1 && p.Types[0].Type == "object" {
		renderSections(w, mc, bpath, p.Types[0])
	} else {
		o("## Types\n\n")

		o("| Type | Description | Choices |\n")
		o("| :--- | :---------- | :------ |\n")

		for _, t := range p.Types {
			ft := t.Type
			if t.Array {
				ft = fmt.Sprintf("[ %s ]", ft)
			} else if t.Map {
				ft = fmt.Sprintf("{ string: %s }", ft)
			} else if t.ArrayOfMap {
				ft = fmt.Sprintf("[ { string: %s } ]", ft)
			} else if t.MapOfArray {
				ft = fmt.Sprintf("{ string: [ %s ] }", ft)
			} else if t.MapOfMap {
				ft = fmt.Sprintf("{ string: { string: %s } }", ft)
			} else if t.ArrayOfArray {
				ft = fmt.Sprintf("[ [ %s ] ]", ft)
			}

			var choices []string
			for _, c := range t.Choices {
				choices = append(choices, fmt.Sprintf("`%v`", c))
			}
			var choicesVal string
			if len(choices) > 0 {
				choicesVal = strings.Join(choices, ", ")
			} else {
				choicesVal = "-"
			}
			desc := "-"
			if t.Description != p.Description {
				desc = strings.ReplaceAll(t.Description, "\n", " ")
			}
			o("| `%s` | %s | %s |\n", ft, desc, choicesVal)

			if len(t.Sections) > 0 {
				renderSections(w, mc, bpath, t)
			}
		}
	}

	if len(p.Examples) > 0 {
		o("## Examples\n\n")

		for _, e := range p.Examples {
			if e.Label != "" {
				o("### %s\n", e.Label)
			}
			if e.Description != "" {
				o("%s\n", strings.TrimSpace(e.Description))
			}
			o("```\n")
			o("%v\n", e.Value)
			o("```\n")
		}
		o("\n")
	}

	return nil
}

func renderSections(w io.Writer, mc *MarkdownConfig, bpath string, t *TypeOption) {
	o := func(str string, args ...any) {
		fmt.Fprintf(w, str, args...)
	}

	o("## Properties\n\n")

	for _, s := range t.Sections {
		if s.Name != "" {
			o("### %s\n\n", s.Name)
		}

		if s.Description != "" {
			o("%s\n\n", s.Description)
		}

		o("| Name | Description | Type | Default | Reloadable |\n")
		o("| :--- | :---------- | :--- | :------ | :--------- |\n")

		var starred bool

		for _, x := range s.Properties {
			var path string
			if mc.RelativeLinks {
				// Version-relative link to the direct child page. An explicit
				// file path (resolved by Docusaurus against the source tree,
				// not the rendered URL) keeps the link scoped to whichever doc
				// version renders this page, so links never bleed across
				// versions and no version segment has to be baked in. A child
				// with nested properties is a directory (index.md); a leaf is
				// a single .md file.
				if hasNestedProps(x) {
					path = "./" + x.Name + "/" + mc.IndexName
				} else {
					path = "./" + x.Name + ".md"
				}
			} else {
				path = filepath.Join(bpath, x.Name)
				if !mc.TrimIndexFile {
					path = filepath.Join(path, mc.IndexName)
				}
			}

			desc := strings.ReplaceAll(x.Description, "\n", " ")
			def := "-"
			if x.Default != nil {
				def = fmt.Sprintf("`%v`", x.Default)
			}
			var typ string
			if len(x.Types) == 1 {
				typ = x.Types[0].Type
			} else {
				typ = "(multiple)"
			}
			rel := reloadCell(x.Reloadable, x.ReloadableNote)
			if strings.HasSuffix(rel, `\*`) {
				starred = true
			}

			// Render link to sub-page.
			o("| [`%s`](%s) | %s | `%s` | %s | %s |\n", x.Name, path, desc, typ, def, rel)
		}

		if starred {
			o("\n\\* See the property page for reload caveats.\n")
		}
	}
}

type MarkdownConfig struct {
	BasePath      string
	OldestLive    string
	RelativeLinks bool
	IndexName     string
	TrimIndexFile bool
	SidebarFile   string
}

// GenerateMarkdown generates a directory of markdown files, including
// the top-level and one for each nested property.
func GenerateMarkdown(config *Config, dir string, mc *MarkdownConfig) error {
	buf := bytes.NewBuffer(nil)

	prop := Property{
		Name:        config.Name,
		Description: config.Description,
		Types: []*TypeOption{
			{
				Type:     "object",
				Sections: config.Sections,
			},
		},
	}

	if mc.BasePath == "/" {
		mc.BasePath = ""
	} else if strings.HasSuffix(mc.BasePath, "/") {
		mc.BasePath = mc.BasePath[:len(mc.BasePath)-1]
	}

	sb := &Sidebar{
		Type:      "category",
		Label:     config.Name,
		Collapsed: true,
		Link: &Link{
			Type: "doc",
			ID:   cleanID(filepath.Join(mc.BasePath, mc.IndexName)),
		},
	}

	err := generatePropMarkdown(&prop, buf, dir, mc, nil, sb)
	if err != nil {
		return fmt.Errorf("generate prop markdown: %w", err)
	}

	// Write the sidebar file.
	f, err := os.Create(mc.SidebarFile)
	if err != nil {
		return fmt.Errorf("create sidebar file: %w", err)
	}
	defer f.Close()
	return json.NewEncoder(f).Encode(sb)
}

func cleanID(p string) string {
	p = strings.TrimSuffix(p, ".md")
	return strings.TrimLeft(p, "/")
}

func generatePropMarkdown(prop *Property, buf *bytes.Buffer, dir string, mc *MarkdownConfig, hier []*hierPath, sb *Sidebar) error {
	buf.Reset()

	if err := generateTemplate(buf, prop, mc, hier); err != nil {
		return fmt.Errorf("execute template: %w", err)
	}

	hasNested := hasNestedProps(prop)
	var path string
	// If there are nested properties, write the index file.
	if hasNested {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("make dir: %w", err)
		}

		path = filepath.Join(dir, mc.IndexName)
	} else {
		path = dir + ".md"
	}

	if err := os.WriteFile(path, buf.Bytes(), 0644); err != nil {
		return fmt.Errorf("write file: %w", err)
	}
	if !hasNested {
		return nil
	}

	var nhier []*hierPath
	nhier = append(nhier, hier...)
	base := mc.BasePath
	if len(nhier) > 0 {
		base = filepath.Join(nhier[len(nhier)-1].Path, prop.Name)
	}
	nhier = append(nhier, &hierPath{
		Name: prop.Name,
		Path: base,
	})

	// Recurse into options having nested properties.
	for _, o := range prop.Types {
		if o.Type == "object" {
			for _, s := range o.Sections {
				for _, p := range s.Properties {

					var nsb *Sidebar
					if !hasNestedProps(p) {
						sb.Items = append(sb.Items, cleanID(filepath.Join(base, p.Name)))
						nsb = sb
					} else {
						nsb = &Sidebar{
							Type:      "category",
							Label:     p.Name,
							Collapsed: true,
							Link: &Link{
								Type: "doc",
								ID:   cleanID(filepath.Join(base, p.Name, mc.IndexName)),
							},
						}
						sb.Items = append(sb.Items, nsb)
					}

					// Property gets its own directory.
					ndir := filepath.Join(dir, p.Name)
					if err := generatePropMarkdown(p, buf, ndir, mc, nhier, nsb); err != nil {
						return err
					}
				}
			}
		}
	}

	return nil
}
