# NATS Config Generator

The NATS server configuration represented as a superset of JSON, consisting of a top-level set of properties (keys) having values which may be primitive types, arrays, or objects.

## Built-in Types

**Primitive types**

- `string`
- `float`
- `integer`
- `boolean`

**Semantic types**

- `duration` - The base type is string corresponds to a [Go time.Duration](https://pkg.go.dev/time#ParseDuration) value.
- `bytes` - The base type is either a string, with a supported suffix unit, or an integer in bytes.

**Container types**

- `array(T)` - An array type supports one or more elements having type `T`.
- `map(T)` - A map type represents a set of key/value pairs where keys are strings and the value is of type `T`.
- `object` - An object type represents a set of key/value pairs where keys are strings and each value can be individually defined.

## Custom Types

Custom types are declared in a YAML file under a top-level key named `types`. See [`./types`](./types) for examples.

## Multiple Types

Some object properties require support for multiple types. For example, the top-level `jetstream` property can be a boolean `true` or `false`, a string expressing `enable` or `disable` (or in the past tense), or an `object` having a set of properties.

In the top-level config, it is declared as follows:

```yaml
jetstream:
  types:
    - boolean
    - enable-disable
    - jetstream
```

### Type Resolution

For the purpose of authoring and maintaining this server config reference, the top-level config file and type definition files are separated. Types can be referenced from other files one or more times.

For example, the top-level `authorization` property references the `authorization` type in another file. Similarily, the handful of places `tls` properties can be defined, there is a shared `tls` _type_ that is referenced to reduce redudancy of managing these types.

When the config and types files are loaded, they are parsed and types must be dereferenced for the purpose of documentation or config generation.

Given the above `jetstream` example, we would expect the dereferenced `jetstream` property to have the following set of value options:

```yaml
jetstream:
  options:
    - type: boolean
    - type: string
      choices:
        - enable
        - disable
        - enabled
        - disabled
     - type: object
       sections:
         - name: ""
           properties:
             ...
```

These represent the _terminal_ options for this property. For deferenced `object` types having their own properties, those properties will be recursively dereferenced. These will be modeled as `sections` with properties.

In the context of documentation generation, only the terminal options will be rendered on a page. Nested properties will be linked and presented on their own page.
