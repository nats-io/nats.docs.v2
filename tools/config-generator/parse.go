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
	Omit           bool
	Reloadable     Reload
	ReloadableNote string `yaml:"reloadable_note"`
	Sections       []*yamlSection
	Properties     yaml.Node
	Version        string
	Removed        string
	Choices        []string
	Versions       map[string]*yamlVersionOverride
}

// yamlVersionOverride is the narrow set of fields a `versions:` entry may
// change. It is deliberately not a full yamlType: an override can restate what
// a property means at a given server version, but never its type or children,
// because those would change the page tree and the sidebar per version for
// reasons that have nothing to do with the version.
type yamlVersionOverride struct {
	Reloadable     Reload
	ReloadableNote string `yaml:"reloadable_note"`
	Default        any
	Description    string
	Deprecation    string
	Choices        []string
}

// ParseOptions configures a parse for one target doc version.
type ParseOptions struct {
	// Version is the server minor version being rendered, e.g. "2.12". Empty
	// renders every property with its unkeyed values, which is the behaviour
	// from before the spec became version-aware.
	Version string

	// KnownVersions is the set of live doc versions, used to reject annotations
	// naming a version that does not exist and to suppress "Since" badges for
	// keys that predate the oldest live version.
	KnownVersions []string
}

// parser carries the state a parse needs beyond the type index. It exists so
// the version target does not have to be threaded through four call sites as an
// extra argument.
type parser struct {
	ytypes  map[string]*yamlType
	version string
	known   []string
}

// Parse takes the config and type definition paths and derives the config.
func Parse(path string, typePaths []string, opts ParseOptions) (*Config, error) {
	yc, err := loadConfig(path)
	if err != nil {
		return nil, err
	}

	for _, v := range opts.KnownVersions {
		if !validVersion(v) {
			return nil, fmt.Errorf("malformed known version %q", v)
		}
	}
	if opts.Version != "" {
		if !validVersion(opts.Version) {
			return nil, fmt.Errorf("malformed target version %q", opts.Version)
		}
		if len(opts.KnownVersions) > 0 && !knownVersion(opts.Version, opts.KnownVersions) {
			return nil, fmt.Errorf("target version %q is not in the known set (%s)",
				opts.Version, strings.Join(opts.KnownVersions, ", "))
		}
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

			if err := normalizeSections(t); err != nil {
				return nil, err
			}

			ytypes[k] = t
		}
	}

	p := &parser{
		ytypes:  ytypes,
		version: opts.Version,
		known:   opts.KnownVersions,
	}

	// Top-level config sections.
	sections, err := p.parseSections(yc.Sections)
	if err != nil {
		return nil, err
	}

	c := Config{
		Name:        yc.Name,
		Description: yc.Description,
		Sections:    sections,
		Version:     opts.Version,
		OldestLive:  oldestVersion(opts.KnownVersions),
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

// normalizeSections folds a `properties:` mapping into a single implicit
// section, so the rest of the parser only ever deals with sections. It applies
// to type definitions and to properties declared at a reference site alike —
// the same shape should mean the same thing in both places.
func normalizeSections(t *yamlType) error {
	if t.Properties.IsZero() {
		return nil
	}
	if len(t.Sections) > 0 {
		return fmt.Errorf("%q has both properties and sections", t.Name)
	}
	t.Sections = []*yamlSection{{Properties: t.Properties}}
	t.Properties = yaml.Node{}
	return nil
}

// parseSections parses a list of encoded YAML sections.
func (p *parser) parseSections(yss []*yamlSection) ([]*Section, error) {
	sections := make([]*Section, len(yss))
	for i, ys := range yss {
		s, err := p.parseSection(ys)
		if err != nil {
			return nil, err
		}
		sections[i] = s
	}
	return sections, nil
}

// parseSection parses an encoded YAML section.
func (p *parser) parseSection(ys *yamlSection) (*Section, error) {
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

		// A property declared at a reference site may carry `properties:` of its
		// own. Normalizing it to a section here is what lets that site override
		// individual children of the type it references, rather than only append
		// new ones.
		if err := normalizeSections(&yp); err != nil {
			return nil, err
		}

		// Parse the property info to a concrete property.
		prop, err := p.parseProperty(&yp)
		if err != nil {
			return nil, err
		}

		// Availability gating happens here and nowhere else. Every property in
		// the tree — including children reached through a type reference —
		// arrives through this loop, and a property that never enters
		// Section.Properties drops out of the page tree, its parent's summary
		// table and the sidebar together, with no version logic in markdown.go.
		if skip, err := p.gatedOut(prop); err != nil {
			return nil, err
		} else if skip {
			continue
		}

		props = append(props, prop)
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
func (p *parser) parseProperty(yp *yamlType) (*Property, error) {
	// Normalize.
	var types []string
	if yp.Type != "" {
		types = append(types, yp.Type)
	} else {
		types = append(types, yp.Types...)
	}

	var opts []*TypeOption

	// When a property resolves to exactly one type, that type's own metadata
	// is inherited by the property. With more than one type there is no
	// defensible answer to "inherit from which?", so nothing is inherited.
	var base *Property

	for _, t := range types {
		ts, bp, err := p.parseType(t)
		if err != nil {
			return nil, err
		}
		if len(types) == 1 {
			base = bp
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
			sections, err := p.parseSections(yp.Sections)
			if err != nil {
				return nil, err
			}
			// Combine sections and properties.
			if len(o.Sections) == 0 {
				o.Sections = sections
			} else if len(sections) > 0 {
				o.Sections, err = overlaySections(o.Sections, sections)
				if err != nil {
					return nil, err
				}
			}
		}
	}

	// A reference-site override may name no type at all and carry only nested
	// `properties:`, because it is restating metadata for keys the base type
	// already defines — `cluster.authorization` correcting two grandchildren
	// under `default_permissions`, say. These are kept apart from Types: they
	// are a patch to apply to whatever object the base resolves to, not a type
	// in their own right, and modelling them as one would replace the base's
	// options (`allow_responses` is `boolean` *or* an object, and lost the
	// boolean when this was tried the other way).
	var overlay []*Section
	if len(opts) == 0 && len(yp.Sections) > 0 {
		s, err := p.parseSections(yp.Sections)
		if err != nil {
			return nil, err
		}
		overlay = s
	}

	// An unrecognised verdict must fail the build. Silently treating it as
	// unset would render no badge, which is indistinguishable from "not yet
	// audited" — the exact confusion the tri-state exists to remove.
	if !yp.Reloadable.Valid() {
		return nil, fmt.Errorf("property %q: unknown reloadable verdict %q (want %q, %q or %q)",
			yp.Name, yp.Reloadable, ReloadYes, ReloadNo, ReloadNoop)
	}

	prop := Property{
		Name:            strings.TrimSpace(yp.Name),
		Description:     strings.TrimSpace(yp.Description),
		Types:           opts,
		Disabled:        yp.Disabled,
		Default:         yp.Default,
		Deprecation:     strings.TrimSpace(yp.Deprecation),
		Examples:        yp.Examples,
		Aliases:         yp.Aliases,
		Reloadable:      yp.Reloadable,
		ReloadableNote:  strings.TrimSpace(yp.ReloadableNote),
		OverlaySections: overlay,
		Omit:            yp.Omit,
		Version:         strings.TrimSpace(yp.Version),
		Removed:         strings.TrimSpace(yp.Removed),
		URL:             yp.URL,
	}

	inheritMeta(&prop, base)

	// Version overrides resolve after inheritance, so a `versions:` block on a
	// type definition is applied before that type's values are inherited down.
	// One rule, no special case for where the annotation was written.
	if err := p.applyVersion(&prop, yp); err != nil {
		return nil, err
	}

	return &prop, nil
}

// applyVersion folds the property's `versions:` overrides for the target version
// onto the resolved property. The unkeyed values are the default for any version
// not explicitly listed, so a new server minor that changed nothing needs no
// spec edit at all.
func (p *parser) applyVersion(prop *Property, yp *yamlType) error {
	if len(yp.Versions) == 0 {
		return nil
	}

	// Go randomizes map iteration, so if two keys both named the target version
	// the winner would be whichever came out last — a verdict that flips
	// between builds. Reject the overlap rather than ordering around it: there
	// is no defensible answer to "which of the two did you mean?". Every key is
	// checked, not just the ones matching the target, so an authoring mistake
	// surfaces on the first build instead of when that version goes live.
	claimed := make(map[string]string, len(yp.Versions))
	var (
		match    *yamlVersionOverride
		matchKey string
	)
	for key, ov := range yp.Versions {
		vs, err := parseVersionKey(key, p.known)
		if err != nil {
			return fmt.Errorf("property %q: %w", prop.Name, err)
		}
		for _, v := range vs {
			if prev, dup := claimed[v]; dup {
				return fmt.Errorf("property %q: version %q is claimed by both %q and %q",
					prop.Name, v, prev, key)
			}
			claimed[v] = key
		}
		if p.version == "" || !knownVersion(p.version, vs) || ov == nil {
			continue
		}
		match, matchKey = ov, key
	}

	// At most one key can match now that overlaps are rejected, so applying
	// after the loop is deterministic.
	if match != nil {
		ov, key := match, matchKey
		if ov.Reloadable != ReloadUnset {
			if !ov.Reloadable.Valid() {
				return fmt.Errorf("property %q: version %q: unknown reloadable verdict %q",
					prop.Name, key, ov.Reloadable)
			}
			prop.Reloadable = ov.Reloadable
		}
		if ov.ReloadableNote != "" {
			prop.ReloadableNote = strings.TrimSpace(ov.ReloadableNote)
		}
		if ov.Default != nil {
			prop.Default = ov.Default
		}
		if ov.Description != "" {
			prop.Description = strings.TrimSpace(ov.Description)
		}
		if ov.Deprecation != "" {
			prop.Deprecation = strings.TrimSpace(ov.Deprecation)
		}
		if len(ov.Choices) > 0 && len(prop.Types) == 1 {
			prop.Types[0].Choices = ov.Choices
		}
	}

	return nil
}

// gatedOut reports whether a property should be omitted from the version being
// rendered, based on `version:` (introduced in) and `removed:` (absent from).
// With no target version nothing is gated, which keeps a bare `go run .` useful
// for local iteration.
func (p *parser) gatedOut(prop *Property) (bool, error) {
	if prop.Version != "" && !validVersion(prop.Version) {
		return false, fmt.Errorf("property %q: malformed version %q", prop.Name, prop.Version)
	}
	if prop.Removed != "" && !validVersion(prop.Removed) {
		return false, fmt.Errorf("property %q: malformed removed %q", prop.Name, prop.Removed)
	}
	if p.version == "" {
		return false, nil
	}
	if prop.Version != "" && cmpVersion(p.version, prop.Version) < 0 {
		return true, nil
	}
	if prop.Removed != "" && cmpVersion(p.version, prop.Removed) >= 0 {
		return true, nil
	}
	return false, nil
}

// overlaySections merges properties declared at a reference site onto the
// properties the referenced type already defines. A same-named property is an
// override — its non-zero fields win — rather than a second page with the same
// name, and the search covers every section of the base, not just the first
// (the `leafnode` type has two named sections, so first-only could never reach
// "Outgoing Connections"). A name with no match is appended, which is what
// makes pure addition — the existing `leafnode-tls` pattern — behave as before.
func overlaySections(base, over []*Section) ([]*Section, error) {
	for _, os := range over {
		for _, op := range os.Properties {
			if target := findProperty(base, op.Name); target != nil {
				if err := mergeProperty(target, op); err != nil {
					return nil, err
				}
				continue
			}
			// Appending is deliberate (leafnode-tls adds handshake_first this
			// way), but omitting a name the base never declared removes
			// nothing and would append a phantom page instead.
			if op.Omit {
				return nil, fmt.Errorf("property %q: omit: true but the referenced type declares no such key", op.Name)
			}
			if len(base) == 0 {
				base = append(base, &Section{})
			}
			base[0].Properties = append(base[0].Properties, op)
		}
	}

	// Drop anything the reference site marked `omit: true`. This is the only
	// way to say "the shared type declares this key but the server rejects it
	// in *this* context" — cluster and gateway authorization reject `users`,
	// leafnode authorization rejects `default_permissions`. Filtering here
	// rather than in parseSection is what lets an override reach it: the
	// override does not exist yet when parseSection runs.
	for _, s := range base {
		kept := s.Properties[:0]
		for _, p := range s.Properties {
			if !p.Omit {
				kept = append(kept, p)
			}
		}
		s.Properties = kept
	}
	return base, nil
}

func findProperty(sections []*Section, name string) *Property {
	for _, s := range sections {
		for _, p := range s.Properties {
			if p.Name == name {
				return p
			}
		}
	}
	return nil
}

// mergeProperty copies the non-zero fields of an override onto a base property.
// Types is included so an override entry that names no type — common, since an
// override usually only restates metadata — keeps the base's types instead of
// blanking them.
func mergeProperty(dst, src *Property) error {
	if len(src.Types) > 0 {
		dst.Types = src.Types
	}
	// Patch the base's object option in place rather than replacing anything.
	// This recurses back through here for each named child, which is what makes
	// a correction more than one level deep possible at all.
	if len(src.OverlaySections) > 0 {
		for _, o := range dst.Types {
			if o.Type == "object" {
				merged, err := overlaySections(o.Sections, src.OverlaySections)
				if err != nil {
					return err
				}
				o.Sections = merged
				break
			}
		}
	}
	if src.Description != "" {
		dst.Description = src.Description
	}
	if src.Deprecation != "" {
		dst.Deprecation = src.Deprecation
	}
	if src.Default != nil {
		dst.Default = src.Default
	}
	if len(src.Aliases) > 0 {
		dst.Aliases = src.Aliases
	}
	if len(src.Examples) > 0 {
		dst.Examples = src.Examples
	}
	if src.URL != "" {
		dst.URL = src.URL
	}
	if src.Omit {
		dst.Omit = true
	}
	if src.Reloadable != ReloadUnset {
		dst.Reloadable = src.Reloadable
	}
	if src.ReloadableNote != "" {
		dst.ReloadableNote = src.ReloadableNote
	}
	if src.Version != "" {
		dst.Version = src.Version
	}
	if src.Removed != "" {
		dst.Removed = src.Removed
	}
	if src.Disabled {
		dst.Disabled = true
	}
	return nil
}

// inheritMeta copies metadata from a referenced type onto the property that
// references it, filling only fields the property left unset. A value written
// at the reference site therefore always beats the type's own value.
//
// Deliberately excluded:
//
//   - Name and Types — the property owns those.
//   - Disabled — config-file generation only.
//   - Deprecation — a deprecation belongs to the use site, not the shape.
//   - Description — markdown.go suppresses the Types-table description when it
//     matches the property description, so inheriting it blanks that cell for
//     no gain.
//   - Examples — these carry concrete values, which makes them the one piece of
//     metadata that is genuinely about the instance rather than the shape. The
//     shared `listen` type's examples hardcode port 4222, so inheriting them
//     would put the client port on the monitoring, cluster, gateway, leafnode,
//     MQTT and WebSocket listen pages. Author examples at the use site.
func inheritMeta(p *Property, base *Property) {
	if base == nil {
		return
	}
	p.Source = base.Name
	if p.Default == nil {
		p.Default = base.Default
	}
	if len(p.Aliases) == 0 {
		p.Aliases = base.Aliases
	}
	if p.URL == "" {
		p.URL = base.URL
	}
	if p.Reloadable == ReloadUnset {
		p.Reloadable = base.Reloadable
	}
	if p.ReloadableNote == "" {
		p.ReloadableNote = base.ReloadableNote
	}
	if p.Version == "" {
		p.Version = base.Version
	}
	if p.Removed == "" {
		p.Removed = base.Removed
	}
}

// parseType resolves a type reference to its terminal options. It also returns
// the dereferenced base property so the caller can inherit the type's metadata;
// that is nil for primitives, which carry none.
func (p *parser) parseType(t string) ([]*TypeOption, *Property, error) {
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
		}}, nil, nil
	}

	// Dereference non-primitive types.
	b, ok := p.ytypes[t]
	if !ok {
		return nil, nil, fmt.Errorf("unknown type %q", t)
	}

	bp, err := p.parseProperty(b)
	if err != nil {
		return nil, nil, err
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

	return tos, bp, nil
}
