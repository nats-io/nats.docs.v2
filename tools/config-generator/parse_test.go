package main

import (
	"strings"
	"testing"
)

// cmpVersion drives both availability gating and Since-badge suppression. If it
// compares lexicographically, a property marked `version: 2.2` is treated as
// newer than a 2.11 doc build and silently disappears from it — which is why the
// 2.2-vs-2.11 and 2.9-vs-2.10 pairs are here rather than as an afterthought.
func TestCmpVersion(t *testing.T) {
	tests := []struct {
		a, b string
		want int
	}{
		{"2.11", "2.11", 0},
		{"2.2", "2.11", -1}, // lexicographic would say +1
		{"2.9", "2.10", -1}, // lexicographic would say +1
		{"2.11", "2.2", 1},
		{"2.14", "2.12", 1},
		{"3.0", "2.99", 1},
		{"2.14.3", "2.14", 0}, // patch component ignored
		{"2.14.0", "2.14.9", 0},
	}
	for _, tt := range tests {
		if got := cmpVersion(tt.a, tt.b); got != tt.want {
			t.Errorf("cmpVersion(%q, %q) = %d, want %d", tt.a, tt.b, got, tt.want)
		}
	}
}

func TestValidVersion(t *testing.T) {
	for _, v := range []string{"2.11", "2.2", "10.0", "2.14.3"} {
		if !validVersion(v) {
			t.Errorf("validVersion(%q) = false, want true", v)
		}
	}
	for _, v := range []string{"", "2", "2.", "x.y", "2.x", "latest"} {
		if validVersion(v) {
			t.Errorf("validVersion(%q) = true, want false", v)
		}
	}
}

// A mistyped version in a `versions:` key must fail the build. If it silently
// matched nothing, the annotation would look applied while the published page
// kept the wrong verdict — the exact failure this whole change exists to stop.
func TestParseVersionKey(t *testing.T) {
	known := []string{"2.11", "2.12", "2.14"}

	got, err := parseVersionKey("2.11, 2.12", known)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 || got[0] != "2.11" || got[1] != "2.12" {
		t.Errorf("parseVersionKey = %v, want [2.11 2.12]", got)
	}

	if _, err := parseVersionKey("2.13", known); err == nil {
		t.Error("expected error for version not in the known set")
	} else if !strings.Contains(err.Error(), "2.13") {
		t.Errorf("error should name the offending version, got: %v", err)
	}

	if _, err := parseVersionKey("2.11,", known); err == nil {
		t.Error("expected error for empty element")
	}
	if _, err := parseVersionKey("banana", known); err == nil {
		t.Error("expected error for malformed version")
	}
}

func TestOldestVersion(t *testing.T) {
	if got := oldestVersion([]string{"2.14", "2.12", "2.11"}); got != "2.11" {
		t.Errorf("oldestVersion = %q, want 2.11", got)
	}
	// Order-independent, and not fooled by string sorting.
	if got := oldestVersion([]string{"2.2", "2.11"}); got != "2.2" {
		t.Errorf("oldestVersion = %q, want 2.2", got)
	}
	if got := oldestVersion(nil); got != "" {
		t.Errorf("oldestVersion(nil) = %q, want empty", got)
	}
}

// inheritMeta must never overwrite something authored at the reference site,
// because that is the only way a shared type can be specialised per context.
func TestInheritMetaFillsOnlyZeroFields(t *testing.T) {
	base := &Property{
		Name:           "host",
		Default:        "0.0.0.0",
		Aliases:        []string{"net"},
		URL:            "https://example.invalid/base",
		Reloadable:     ReloadNo,
		ReloadableNote: "base note",
		Version:        "2.2",
		Removed:        "2.99",
		Description:    "base description",
		Examples:       []*Example{{Label: "base", Value: "x"}},
	}

	// Empty property inherits everything inheritable.
	got := &Property{Name: "host"}
	inheritMeta(got, base)
	if got.Default != "0.0.0.0" {
		t.Errorf("Default = %v, want 0.0.0.0", got.Default)
	}
	if len(got.Aliases) != 1 || got.Aliases[0] != "net" {
		t.Errorf("Aliases = %v, want [net]", got.Aliases)
	}
	if got.Reloadable != ReloadNo {
		t.Errorf("Reloadable = %v, want %v", got.Reloadable, ReloadNo)
	}
	if got.ReloadableNote != "base note" || got.Version != "2.2" || got.Removed != "2.99" {
		t.Errorf("note/version/removed not inherited: %+v", got)
	}

	// Description and Examples are deliberately NOT inherited. Examples carry
	// concrete values — the shared `listen` type hardcodes port 4222 — so
	// inheriting them puts the client port on the monitoring, cluster, gateway,
	// leafnode, MQTT and WebSocket pages.
	if got.Description != "" {
		t.Errorf("Description must not be inherited, got %q", got.Description)
	}
	if len(got.Examples) != 0 {
		t.Errorf("Examples must not be inherited, got %d", len(got.Examples))
	}

	// A value at the reference site wins.
	site := &Property{
		Name:           "host",
		Default:        "127.0.0.1",
		Aliases:        []string{"addr"},
		Reloadable:     ReloadYes,
		ReloadableNote: "site note",
		Version:        "2.12",
	}
	inheritMeta(site, base)
	if site.Default != "127.0.0.1" {
		t.Errorf("site Default overwritten: %v", site.Default)
	}
	if site.Aliases[0] != "addr" {
		t.Errorf("site Aliases overwritten: %v", site.Aliases)
	}
	if site.Reloadable != ReloadYes {
		t.Error("site Reloadable overwritten")
	}
	if site.ReloadableNote != "site note" || site.Version != "2.12" {
		t.Errorf("site note/version overwritten: %+v", site)
	}

	// A nil base is a primitive type and must be a no-op.
	untouched := &Property{Name: "port"}
	inheritMeta(untouched, nil)
	if untouched.Reloadable != ReloadUnset || untouched.Default != nil {
		t.Error("nil base must not modify the property")
	}
}

func TestApplyVersion(t *testing.T) {
	known := []string{"2.11", "2.12", "2.14"}

	yp := &yamlType{
		Name: "max_memory_store",
		Versions: map[string]*yamlVersionOverride{
			"2.11": {Reloadable: ReloadNo, ReloadableNote: "any change fails"},
		},
	}

	// Target version listed: the override applies.
	p := &parser{version: "2.11", known: known}
	prop := &Property{Name: "max_memory_store", Reloadable: ReloadYes}
	if err := p.applyVersion(prop, yp); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if prop.Reloadable != ReloadNo || prop.ReloadableNote != "any change fails" {
		t.Errorf("override not applied: %+v", prop)
	}

	// Target version NOT listed: the unkeyed value stands. This is the rule that
	// lets a new server minor which changed nothing need no spec edit.
	p = &parser{version: "2.14", known: known}
	prop = &Property{Name: "max_memory_store", Reloadable: ReloadYes}
	if err := p.applyVersion(prop, yp); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if prop.Reloadable != ReloadYes {
		t.Error("unlisted version must fall through to the base value")
	}

	// Comma keys match every element.
	multi := &yamlType{
		Name:     "remotes",
		Versions: map[string]*yamlVersionOverride{"2.11, 2.12": {Reloadable: ReloadNo}},
	}
	for _, v := range []string{"2.11", "2.12"} {
		p = &parser{version: v, known: known}
		prop = &Property{Name: "remotes", Reloadable: ReloadYes}
		if err := p.applyVersion(prop, multi); err != nil {
			t.Fatalf("unexpected error at %s: %v", v, err)
		}
		if prop.Reloadable != ReloadNo {
			t.Errorf("comma key did not match %s", v)
		}
	}

	// An unknown version is an authoring error even when it is not the target,
	// so a typo cannot hide in a version nobody is currently building.
	bad := &yamlType{
		Name:     "whatever",
		Versions: map[string]*yamlVersionOverride{"2.13": {Reloadable: ReloadNo}},
	}
	p = &parser{version: "2.14", known: known}
	if err := p.applyVersion(&Property{Name: "whatever"}, bad); err == nil {
		t.Error("expected error naming the unknown version")
	} else if !strings.Contains(err.Error(), "whatever") {
		t.Errorf("error should name the property, got: %v", err)
	}

	// Two keys claiming the same version must fail the build. Map iteration is
	// randomized, so silently taking one would make the rendered verdict differ
	// between builds of an unchanged spec.
	overlap := &yamlType{
		Name: "listen",
		Versions: map[string]*yamlVersionOverride{
			"2.11, 2.12": {Reloadable: ReloadNo},
			"2.12":       {Reloadable: ReloadYes},
		},
	}
	for _, v := range []string{"2.11", "2.12", "2.14"} {
		p = &parser{version: v, known: known}
		err := p.applyVersion(&Property{Name: "listen"}, overlap)
		if err == nil {
			t.Errorf("%s: expected overlap to be rejected", v)
			continue
		}
		// Rejected while building *any* version, including one the overlapping
		// keys do not name, so the mistake cannot hide until 2.12 is built.
		if !strings.Contains(err.Error(), "2.12") {
			t.Errorf("%s: error should name the contested version, got: %v", v, err)
		}
	}
}

func TestGatedOut(t *testing.T) {
	tests := []struct {
		name    string
		target  string
		version string
		removed string
		want    bool
	}{
		{"no annotations", "2.11", "", "", false},
		{"introduced later", "2.11", "2.12", "", true},
		{"introduced same", "2.12", "2.12", "", false},
		{"introduced earlier", "2.14", "2.12", "", false},
		{"removed in target", "2.14", "", "2.14", true},
		{"removed later", "2.12", "", "2.14", false},
		{"both set, inside window", "2.12", "2.11", "2.14", false},
		{"both set, before window", "2.11", "2.12", "2.14", true},
		{"both set, after window", "2.14", "2.11", "2.14", true},
		{"introduced 2.2 vs 2.11 target", "2.11", "2.2", "", false},
		{"no target renders everything", "", "2.14", "", false},
	}
	for _, tt := range tests {
		p := &parser{version: tt.target}
		got, err := p.gatedOut(&Property{Name: "x", Version: tt.version, Removed: tt.removed})
		if err != nil {
			t.Errorf("%s: unexpected error: %v", tt.name, err)
			continue
		}
		if got != tt.want {
			t.Errorf("%s: gatedOut = %v, want %v", tt.name, got, tt.want)
		}
	}

	p := &parser{version: "2.14"}
	if _, err := p.gatedOut(&Property{Name: "x", Version: "banana"}); err == nil {
		t.Error("expected error for malformed version")
	}
}

// overlaySections is what lets a specialised type restate an inherited child
// rather than only append new ones. The regression risk is the opposite
// direction: pure addition must keep working, because `leafnode-tls` relies on
// it and would otherwise start emitting duplicate pages.
func TestOverlaySections(t *testing.T) {
	newBase := func() []*Section {
		return []*Section{
			{Name: "Incoming", Properties: []*Property{
				{Name: "port", Types: []*TypeOption{{Type: "integer"}}, Default: 4222},
			}},
			{Name: "Outgoing", Properties: []*Property{
				{Name: "url", Types: []*TypeOption{{Type: "string"}}},
			}},
		}
	}

	// Override a property in a NON-first section. Matching only the first
	// section would silently append a duplicate instead.
	base := newBase()
	got, err := overlaySections(base, []*Section{{Properties: []*Property{
		{Name: "url", Reloadable: ReloadNo},
	}}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if n := len(got[1].Properties); n != 1 {
		t.Fatalf("Outgoing should still have 1 property, got %d", n)
	}
	url := got[1].Properties[0]
	if url.Reloadable != ReloadNo {
		t.Error("override did not reach the non-first section")
	}
	// A typeless override keeps the base's types rather than blanking them.
	if len(url.Types) != 1 || url.Types[0].Type != "string" {
		t.Errorf("typeless override lost base types: %+v", url.Types)
	}
	if len(got[0].Properties) != 1 {
		t.Error("override leaked into the first section")
	}

	// A name with no match is appended — the existing additive pattern.
	base = newBase()
	got, err = overlaySections(base, []*Section{{Properties: []*Property{
		{Name: "handshake_first", Types: []*TypeOption{{Type: "boolean"}}},
	}}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if n := len(got[0].Properties); n != 2 {
		t.Errorf("expected append into first section, got %d properties", n)
	}
	if findProperty(got, "handshake_first") == nil {
		t.Error("appended property not found")
	}

	// Overriding must not duplicate.
	base = newBase()
	got, err = overlaySections(base, []*Section{{Properties: []*Property{
		{Name: "port", Default: 6222},
	}}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	var count int
	for _, s := range got {
		for _, p := range s.Properties {
			if p.Name == "port" {
				count++
			}
		}
	}
	if count != 1 {
		t.Errorf("port appears %d times, want 1", count)
	}
	if p := findProperty(got, "port"); p.Default != 6222 {
		t.Errorf("Default = %v, want 6222", p.Default)
	}
}

func TestReloadCell(t *testing.T) {
	tests := []struct {
		r    Reload
		note string
		want string
	}{
		{ReloadUnset, "", "-"},
		{ReloadUnset, "a caveat", "-"}, // no verdict: the page carries the note
		{ReloadYes, "", "Yes"},
		{ReloadYes, "a caveat", `Yes\*`},
		{ReloadNo, "", "No"},
		{ReloadNo, "a caveat", `No\*`},
		// A silent no-op must not collapse into Yes or No: the reload is
		// accepted (so "No" is wrong) and the value never takes effect (so
		// "Yes" is worse).
		{ReloadNoop, "", "Ignored"},
		{ReloadNoop, "a caveat", `Ignored\*`},
	}
	for _, tt := range tests {
		if got := reloadCell(tt.r, tt.note); got != tt.want {
			t.Errorf("reloadCell(%v, %q) = %q, want %q", tt.r, tt.note, got, tt.want)
		}
	}
}

// A verdict outside the known vocabulary must fail the build rather than
// degrade to "unverified" — a typo that renders as a blank badge is
// indistinguishable from a key nobody has audited yet.
func TestReloadValid(t *testing.T) {
	for _, r := range []Reload{ReloadUnset, ReloadYes, ReloadNo, ReloadNoop} {
		if !r.Valid() {
			t.Errorf("Valid(%q) = false, want true", r)
		}
	}
	for _, r := range []Reload{"yes", "no", "true", "false", "partial", "unverified"} {
		if r.Valid() {
			t.Errorf("Valid(%q) = true, want false", r)
		}
	}
}

// A multi-line YAML note must not reach a JSX attribute with raw newlines or
// unescaped quotes — JSX attribute strings do not process backslash escapes, so
// a naive %q would render a literal \n to the reader.
func TestMdxAttr(t *testing.T) {
	got := mdxAttr("line one\nline two   with  spaces")
	if want := "line one line two with spaces"; got != want {
		t.Errorf("mdxAttr = %q, want %q", got, want)
	}
	if got := mdxAttr(`say "hi" & bye`); got != "say &quot;hi&quot; &amp; bye" {
		t.Errorf("mdxAttr escaping = %q", got)
	}
}

// A reference-site override may need to correct a key more than one level
// down — cluster.authorization restating two grandchildren under
// default_permissions. That override names no type, so it must merge into the
// base's object rather than replace it, or every sibling the base defines
// disappears and the correction silently does not apply.
func TestMergePropertyOverlaysNestedObject(t *testing.T) {
	// allow_responses is `boolean` OR an object, so an override must patch the
	// object option and leave the boolean alone. Modelling the override as a
	// type of its own replaced both options, which dropped the boolean and
	// reordered the children — and child order drives sidebar order.
	base := &Property{Name: "allow_responses", Types: []*TypeOption{
		{Type: "boolean"},
		{Type: "object", Sections: []*Section{{Properties: []*Property{
			{Name: "max", Reloadable: ReloadYes, Types: []*TypeOption{{Type: "integer"}}},
			{Name: "expires", Reloadable: ReloadYes, Types: []*TypeOption{{Type: "duration"}}},
		}}}},
	}}
	over := &Property{
		Name: "allow_responses",
		OverlaySections: []*Section{{Properties: []*Property{
			{Name: "expires", Reloadable: ReloadNoop},
		}}},
	}

	if err := mergeProperty(base, over); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(base.Types) != 2 || base.Types[0].Type != "boolean" {
		t.Fatalf("base type options disturbed: %+v", base.Types)
	}
	props := base.Types[1].Sections[0].Properties
	if len(props) != 2 {
		t.Fatalf("children lost or appended: %d, want 2", len(props))
	}
	if props[0].Name != "max" || props[1].Name != "expires" {
		t.Errorf("child order changed: %s, %s", props[0].Name, props[1].Name)
	}
	if props[1].Reloadable != ReloadNoop {
		t.Errorf("expires = %q, want %q", props[1].Reloadable, ReloadNoop)
	}
	if props[0].Reloadable != ReloadYes || props[0].Types[0].Type != "integer" {
		t.Errorf("untouched sibling changed: %+v", props[0])
	}
}

func TestOverlaySectionsOmit(t *testing.T) {
	base := []*Section{{Properties: []*Property{
		{Name: "username", Types: []*TypeOption{{Type: "string"}}},
		{Name: "users", Types: []*TypeOption{{Type: "string"}}},
	}}}

	got, err := overlaySections(base, []*Section{{Properties: []*Property{
		{Name: "users", Omit: true},
	}}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if findProperty(got, "users") != nil {
		t.Error("omitted property still present")
	}
	if findProperty(got, "username") == nil {
		t.Error("omit removed the wrong property")
	}

	_, err = overlaySections(base, []*Section{{Properties: []*Property{
		{Name: "nosuchkey", Omit: true},
	}}})
	if err == nil {
		t.Error("expected an error omitting a name the base does not declare")
	}
}
