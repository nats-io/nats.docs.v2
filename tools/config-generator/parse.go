package main

import (
	"fmt"
	"os"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

var (
	arrayTypeRe = regexp.MustCompile(`^array\((.+)\)$`)
	mapTypeRe   = regexp.MustCompile(`^map\((.+)\)$`)
)

var (
	primitiveTypes = map[string]string{
		"boolean":  "",
		"float":    "",
		"integer":  "",
		"string":   "",
		"duration": "Duration as a string with units such as 100ms, 10s, 5m, or 2h.",
		"storage":  "Size in bytes or string with a metric unit such as 100K, 50M, 3G, or 1T.",
		"object":   "An object with a set of explicit properties that can be set.",
	}
)

type yamlConfig struct {
	Name        string
	Description string
	Sections    []*yamlSection
}

type yamlSection struct {
	Name        string
	Description string
	URL         string
	Properties  yaml.Node
}

type yamlFile struct {
	Types map[string]*yamlType
}

type yamlType struct {
	Name           string
	Type           string
	Types          []string
	URL            string
	Default        any
	Disabled       bool
	Description    string
	Deprecation    string
	Examples       []*Example
	Aliases        []string
	Reloadable     *bool
	ReloadableNote string `yaml:"reloadable_note"`
	Sections       []*yamlSection
	Properties     yaml.Node
	Version        string
	Choices        []string
}

// Parse takes the config and type definition paths and derives the config.
func Parse(path string, typePaths []string) (*Config, error) {
	yc, err := loadConfig(path)
	if err != nil {
		return nil, err
	}

	// Load and index the types for reference when parsing.
	ytypes := make(map[string]*yamlType)
	for _, path := range typePaths {
		f, err := loadTypes(path)
		if err != nil {
			return nil, err
		}
		for k, t := range f.Types {
			// Check for duplicates.
			if _, ok := ytypes[k]; ok {
				return nil, fmt.Errorf("duplicate type found: %q", k)
			}
			t.Name = k
			if t.Type != "" {
				t.Types = []string{t.Type}
				t.Type = ""
			}
			if len(t.Types) == 0 {
				return nil, fmt.Errorf("type %q has no types", k)
			}

			// If this property has properties itself, we define an implicit
			// section for it.
			if !t.Properties.IsZero() {
				if len(t.Sections) > 0 {
					return nil, fmt.Errorf("type %q has both properties and sections", k)
				}

				t.Sections = []*yamlSection{{
					Properties: t.Properties,
				}}

				t.Properties = yaml.Node{}
			}

			ytypes[k] = t
		}
	}

	// Top-level config sections.
	sections, err := parseSections(ytypes, yc.Sections)
	if err != nil {
		return nil, err
	}

	c := Config{
		Name:        yc.Name,
		Description: yc.Description,
		Sections:    sections,
	}

	return &c, nil
}

func loadConfig(path string) (*yamlConfig, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", path, err)
	}

	var f yamlConfig
	err = yaml.Unmarshal(b, &f)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", path, err)
	}

	return &f, nil
}

func loadTypes(path string) (*yamlFile, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", path, err)
	}

	var f yamlFile
	err = yaml.Unmarshal(b, &f)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", path, err)
	}

	return &f, nil
}

// parseSections parses a list of encoded YAML sections.
func parseSections(ytypes map[string]*yamlType, yss []*yamlSection) ([]*Section, error) {
	sections := make([]*Section, len(yss))
	for i, ys := range yss {
		s, err := parseSection(ytypes, ys)
		if err != nil {
			return nil, err
		}
		sections[i] = s
	}
	return sections, nil
}

// parseSection parses an encoded YAML section.
func parseSection(ytypes map[string]*yamlType, ys *yamlSection) (*Section, error) {
	// If the section has no properties, it's just a header.
	if len(ys.Properties.Content) == 0 {
		return &Section{
			Name:        ys.Name,
			Description: ys.Description,
		}, nil
	}

	// Validate the node type.
	if ys.Properties.Kind != yaml.MappingNode {
		return nil, fmt.Errorf("expected YAML mapping node: line %d", ys.Properties.Line)
	}

	// Validate there are key-value pairs.
	if len(ys.Properties.Content)%2 != 0 {
		return nil, fmt.Errorf("expected key-value pairs")
	}

	var props []*Property
	for i := 0; i < len(ys.Properties.Content)/2; i++ {
		kc := ys.Properties.Content[i*2]
		vc := ys.Properties.Content[i*2+1]

		// Decode the raw property type info.
		var yp yamlType
		if err := vc.Decode(&yp); err != nil {
			return nil, fmt.Errorf("failed property decode at line %d: %w", vc.Line, err)
		}

		yp.Name = kc.Value

		// Parse the property info to a concrete property.
		p, err := parseProperty(ytypes, &yp)
		if err != nil {
			return nil, err
		}

		props = append(props, p)
	}

	s := Section{
		Name:        ys.Name,
		Description: ys.Description,
		Properties:  props,
	}

	return &s, nil
}

// parseProperty recursively builds a property from the raw property info.
// The provided `type` or `types` dictates how the property is constructed.
// The simplest case is a single primitive type, e.g. `string`.
func parseProperty(ytypes map[string]*yamlType, yp *yamlType) (*Property, error) {
	// Normalize.
	var types []string
	if yp.Type != "" {
		types = append(types, yp.Type)
	} else {
		types = append(types, yp.Types...)
	}

	var opts []*TypeOption

	for _, t := range types {
		ts, err := parseType(ytypes, t)
		if err != nil {
			return nil, err
		}
		opts = append(opts, ts...)
	}

	if len(opts) == 1 {
		o := opts[0]
		if o.Choices == nil {
			o.Choices = append(o.Choices, yp.Choices...)
		}
		if o.Description == "" {
			o.Description = yp.Description
		}
		if o.Type == "object" {
			sections, err := parseSections(ytypes, yp.Sections)
			if err != nil {
				return nil, err
			}
			// Combine sections and properties.
			if len(o.Sections) == 0 {
				o.Sections = sections
			} else if len(sections) > 0 {
				o.Sections[0].Properties = append(o.Sections[0].Properties, sections[0].Properties...)
			}
		}
	}

	// Assume properties are reloadable by default.
	reloadable := true
	if yp.Reloadable != nil {
		reloadable = *yp.Reloadable
	}

	p := Property{
		Name:           strings.TrimSpace(yp.Name),
		Description:    strings.TrimSpace(yp.Description),
		Types:          opts,
		Disabled:       yp.Disabled,
		Default:        yp.Default,
		Deprecation:    strings.TrimSpace(yp.Deprecation),
		Examples:       yp.Examples,
		Aliases:        yp.Aliases,
		Reloadable:     reloadable,
		ReloadableNote: strings.TrimSpace(yp.ReloadableNote),
		URL:            yp.URL,
	}

	return &p, nil
}

func parseType(ytypes map[string]*yamlType, t string) ([]*TypeOption, error) {
	var (
		isArray bool
		isMap   bool
	)

	if m := arrayTypeRe.FindStringSubmatch(t); len(m) == 2 {
		isArray = true
		t = m[1]
	}
	if m := mapTypeRe.FindStringSubmatch(t); len(m) == 2 {
		isMap = true
		t = m[1]
	}

	// Primitive types.
	if d, ok := primitiveTypes[t]; ok {
		var choices []string
		if t == "boolean" {
			choices = []string{"true", "false"}
		}
		return []*TypeOption{{
			Description: d,
			Type:        t,
			Map:         isMap,
			Array:       isArray,
			Choices:     choices,
		}}, nil
	}

	// Dereference non-primitive types.
	b, ok := ytypes[t]
	if !ok {
		return nil, fmt.Errorf("unknown type %q", t)
	}

	bp, err := parseProperty(ytypes, b)
	if err != nil {
		return nil, err
	}

	var tos []*TypeOption
	for _, t := range bp.Types {
		x := &TypeOption{
			Description: t.Description,
			Type:        t.Type,
			Sections:    t.Sections,
			Choices:     t.Choices,
		}

		// Wrap with parent type.
		if isMap {
			if t.Map {
				x.MapOfMap = true
			} else if t.Array {
				x.MapOfArray = true
			} else {
				x.Map = true
			}
		} else if isArray {
			if t.Map {
				x.ArrayOfMap = true
			} else if t.Array {
				x.ArrayOfArray = true
			} else {
				x.Array = true
			}
		}
		tos = append(tos, x)
	}

	return tos, nil
}
