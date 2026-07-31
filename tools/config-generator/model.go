package main

// Reload is a property's hot-reload verdict. The vocabulary is deliberately the
// same as the `reloadable-audit.tsv` columns, so a backfilled value can be read
// straight across from the audit and checked against it without translation.
//
// The zero value means no verdict has been authored, which is distinct from
// ReloadNo: a missing verdict admits we have not checked, and renders no badge.
type Reload string

const (
	ReloadUnset Reload = ""

	// ReloadYes: the running server picks the change up on SIGHUP.
	ReloadYes Reload = "reloadable"

	// ReloadNo: the reload is rejected. diffOptions aborts on the first
	// unsupported field, so this fails the *whole* reload — including any
	// legitimately reloadable change made in the same edit.
	ReloadNo Reload = "not-reloadable"

	// ReloadNoop: the reload is accepted and logged, and the new value is then
	// ignored until restart. The dangerous case, because nothing the operator
	// can observe distinguishes it from a change that took effect.
	ReloadNoop Reload = "noop"
)

// Valid reports whether r is a verdict the renderer knows how to draw. Parsing
// rejects anything else so a typo fails the build rather than silently
// rendering as "no verdict yet".
func (r Reload) Valid() bool {
	switch r {
	case ReloadUnset, ReloadYes, ReloadNo, ReloadNoop:
		return true
	}
	return false
}

// Config models the configuration.
type Config struct {
	// Name used for doc generation.
	Name string

	// Top-level config description for doc generation.
	Description string

	// Sections are the top-level sections for the config. This is modeled
	// as a slice to preserve ordering during doc/config generation.
	Sections []*Section

	// Version is the server minor version this config was resolved for, or
	// empty when no version was targeted.
	Version string

	// OldestLive is the lowest documented version. A property introduced at or
	// before it gets no "Since" badge, since every live version has it.
	OldestLive string
}

// Section provides logical naming and organization for properties.
// Note: an unnamed section will be used for consistency of modeling.
type Section struct {
	// Name of the section, e.g. "Connectivity"
	Name string

	// URL is an optional URL to a page with more information this section.
	URL string

	// Description of the section.
	Description string

	// Properties contains the ordered set of properties within this section.
	Properties []*Property
}

// Property models a configuration property. The config is a top-level object
// (without curly braces) consistency of multiple properties. Each property
// may support one or more value types, include primitives, arrays, and objects.
type Property struct {
	// Name of the property, e.g. `host` or `jetstream`.
	Name string

	// Types are the set of types this property's value could be.
	Types []*TypeOption

	// URL is an optional URL to a page with more information about
	// this property.
	URL string

	// Description of the property.
	Description string

	// Deprecation is an optional note on the property being deprecated
	// and whether there is an alternate property to use.
	Deprecation string

	// Default value for this property. In practice, this only applies to
	// primitive values.
	Default any

	// Disabled is applied when generating a config file to explicitly
	// comment out a property. For example, when the `cluster` block is
	// present, it implies that it is enabled. If this property is true,
	// the generated config file will comment this block out.
	Disabled bool

	// Examples are a set of example values.
	Examples []*Example

	// Aliases are the set of aliases for this property, e.g. `subscribe`
	// and `sub`.
	Aliases []string

	// Reloadable indicates whether a change to this property in a server config
	// can be hot-reloaded rather than requiring a hard restart of the server.
	// ReloadUnset means no verdict has been authored; only an explicit verdict
	// renders a badge.
	Reloadable Reload

	// ReloadableNote is an optional note referring to caveats on whether
	// this property is reloadable. For example, some properties that are
	// previously disabled cannot be enabled via a reload. However, if they
	// are enabled with particular configuration, those properties can often
	// be hot-reloaded.
	ReloadableNote string

	// Version indicates the version of the server this property
	// became available. Properties are omitted from doc versions older than
	// this.
	Version string

	// Removed indicates the version of the server this property was dropped
	// in. Properties are omitted from that doc version onward.
	Removed string

	// OverlaySections holds nested `properties:` written at a reference site by
	// an entry that names no type. They are a patch applied to whatever object
	// the base resolves to — never a type of their own — which is what lets a
	// correction reach a grandchild without disturbing the base's own options.
	OverlaySections []*Section

	// Omit drops this property from the rendered tree at one reference site.
	// A shared type may declare a key that the server rejects in a particular
	// context — cluster and gateway authorization reject `users` outright — and
	// documenting it there tells the reader to write config that fails.
	Omit bool

	// Source names the type this property was dereferenced from, or is empty
	// when it was declared inline. It renders nowhere; it exists so an audit can
	// group pages by where a verdict would have to be authored, which is what
	// reveals a shared type resolving to conflicting verdicts per context.
	Source string
}

// Example provides a way to document examples for a property.
type Example struct {
	// Short label for the example.
	Label string

	// Longer description of the example, noting specific details.
	Description string

	// The value, which will be rendered as code.
	Value string
}

// TypeOption represents a value type for a property type.
// For example, the `jetstream` property can be a boolean, a string
// enum, or a JetStream object with its own set of properties.
type TypeOption struct {
	// Defines the type, whether primitive or an object type.
	Type string

	// Denotes the value is an array of other value types.
	Array bool

	// Denotes the value is an arbitrary map of string to any value type.
	Map bool

	// Defines the option is an map of an array of the specified type.
	MapOfArray bool

	// Defines the option is an array of maps of the specified type.
	ArrayOfMap bool

	// Defines the option is an array of arrays of the specified type.
	MapOfMap bool

	// Defines the option is an array of arrays of the specified type.
	ArrayOfArray bool

	// For value types that are enums, this defines the set of choices.
	Choices []string

	// Description of this type option in the context of the parent property.
	Description string

	// Sections represent the dereferenced sections (of properties) for this
	// type option. This is only applicable if the type is an object.
	Sections []*Section
}
