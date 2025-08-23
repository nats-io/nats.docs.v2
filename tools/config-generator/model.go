package main

// Config models the configuration.
type Config struct {
	// Name used for doc generation.
	Name string

	// Top-level config description for doc generation.
	Description string

	// Sections are the top-level sections for the config. This is modeled
	// as a slice to preserve ordering during doc/config generation.
	Sections []*Section
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

	// Reloadable indicates a change to this property in a server config can
	// be hot-reloaded rather than requiring a hard restart of the server.
	Reloadable bool

	// ReloadableNote is an optional note referring to caveats on whether
	// this property is reloadable. For example, some properties that are
	// previously disabled cannot be enabled via a reload. However, if they
	// are enabled with particular configuration, those properties can often
	// be hot-reloaded.
	ReloadableNote string

	// Version indicates the version of the server this property
	// became available.
	Version string
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
