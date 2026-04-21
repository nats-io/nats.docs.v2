package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"text/template"
	"unicode"
	"unicode/utf8"
)

const (
	errorsJSONPath = "server/errors.json"
	errorsGoPath   = "server/errors.go"
)

var strict bool

// Collects unresolved type names during schema generation for diagnostics.
var unresolvedTypes []string

// Header source files - scanned in order to find all header constants
var headerSourceFiles = []string{
	"server/stream.go",
	"server/consumer.go",
	"server/jetstream_api.go",
	"server/msgtrace.go",
	"server/accounts.go",
	"server/auth_callout.go",
}

// Monitor source files - parsed to build the TypeRegistry.
// Includes files that define types referenced from monitor response structs.
var monitorSourceFiles = []string{
	"server/monitor.go",
	"server/monitor_sort_opts.go",
	"server/events.go",
	"server/stream.go",
	"server/consumer.go",
	"server/jetstream.go",
	"server/opts.go",
	"server/auth.go",
	"server/accounts.go",
	"server/sublist.go",
	"server/store.go",
	"server/jetstream_errors.go",
	"server/jetstream_cluster.go",
	"server/filestore.go",
}

// -------------------------------------------------------------------
// TypeRegistry: multi-file Go type resolution
// -------------------------------------------------------------------

type TypeKind int

const (
	TypeKindStruct TypeKind = iota
	TypeKindEnum
	TypeKindAlias
	TypeKindMap
)

type FieldInfo struct {
	Name        string   // Go field name
	JSONName    string   // from json tag
	Type        ast.Expr // raw AST type
	Description string   // from doc or inline comment
	OmitEmpty   bool     // json tag has omitempty
	OmitZero    bool     // json tag has omitzero
	Embedded    bool     // embedded struct (no field name)
}

type EnumValue struct {
	Name  string // Go const name
	Value string // string literal value
}

type TypeInfo struct {
	Name       string
	Kind       TypeKind
	Fields     []FieldInfo // for structs
	EnumValues []EnumValue // for string enums
	Doc        string      // doc comment on the type
	Underlying ast.Expr    // for aliases
	StructType *ast.StructType
}

type TypeRegistry struct {
	types map[string]*TypeInfo
}

func NewTypeRegistry() *TypeRegistry {
	return &TypeRegistry{
		types: make(map[string]*TypeInfo),
	}
}

// ParseFile parses a single Go source file and registers all types and const enums.
func (r *TypeRegistry) ParseFile(path string) error {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
	if err != nil {
		return fmt.Errorf("failed to parse %s: %w", path, err)
	}

	// First pass: collect all type declarations
	for _, decl := range file.Decls {
		genDecl, ok := decl.(*ast.GenDecl)
		if !ok || genDecl.Tok != token.TYPE {
			continue
		}
		for _, spec := range genDecl.Specs {
			typeSpec, ok := spec.(*ast.TypeSpec)
			if !ok {
				continue
			}
			info := &TypeInfo{Name: typeSpec.Name.Name}

			// Extract doc comment
			if typeSpec.Doc != nil {
				info.Doc = typeSpec.Doc.Text()
			} else if genDecl.Doc != nil && len(genDecl.Specs) == 1 {
				info.Doc = genDecl.Doc.Text()
			}

			switch t := typeSpec.Type.(type) {
			case *ast.StructType:
				info.Kind = TypeKindStruct
				info.StructType = t
				info.Fields = extractFields(t, file)
			case *ast.MapType:
				info.Kind = TypeKindMap
				info.Underlying = t
			default:
				info.Kind = TypeKindAlias
				info.Underlying = typeSpec.Type
			}
			r.types[info.Name] = info
		}
	}

	// Second pass: collect const blocks for enum values
	for _, decl := range file.Decls {
		genDecl, ok := decl.(*ast.GenDecl)
		if !ok || genDecl.Tok != token.CONST {
			continue
		}
		r.extractEnumConsts(genDecl)
	}

	return nil
}

// extractFields extracts field info from a struct type, including inline comments.
func extractFields(st *ast.StructType, file *ast.File) []FieldInfo {
	var fields []FieldInfo
	for _, field := range st.Fields.List {
		fi := FieldInfo{Type: field.Type}

		// Handle embedded structs (no names)
		if len(field.Names) == 0 {
			fi.Embedded = true
			// Try to get the embedded type name
			switch t := field.Type.(type) {
			case *ast.Ident:
				fi.Name = t.Name
			case *ast.StarExpr:
				if id, ok := t.X.(*ast.Ident); ok {
					fi.Name = id.Name
				}
			case *ast.SelectorExpr:
				// External embedded types (e.g., sync.RWMutex) — skip,
				// these are implementation details not serialized to JSON.
				continue
			}
			if fi.Name == "" {
				continue // Skip unrecognized embedded types
			}
			fields = append(fields, fi)
			continue
		}

		fi.Name = field.Names[0].Name

		// Extract JSON tag
		if field.Tag != nil {
			jsonName, omitEmpty, omitZero, found, exclude := parseJSONTag(field.Tag.Value)
			if exclude {
				// json:"-" means explicitly excluded
				continue
			}
			if found {
				fi.JSONName = jsonName
				fi.OmitEmpty = omitEmpty
				fi.OmitZero = omitZero
			} else {
				// Tag exists but has no json: key (e.g., yaml:"foo")
				// encoding/json uses the Go field name in this case
				fi.JSONName = fi.Name
				fi.OmitEmpty = true
			}
		} else {
			// No tag at all: Go's encoding/json uses the field name as-is
			fi.JSONName = fi.Name
			fi.OmitEmpty = true
		}

		// Extract description: doc comment first, then inline comment
		if field.Doc != nil {
			fi.Description = cleanComment(field.Doc.Text())
		} else if field.Comment != nil {
			fi.Description = cleanComment(field.Comment.Text())
		}

		fields = append(fields, fi)
	}
	return fields
}

// extractEnumConsts processes a const block and associates values with their type.
func (r *TypeRegistry) extractEnumConsts(genDecl *ast.GenDecl) {
	var currentType string

	for _, spec := range genDecl.Specs {
		vs, ok := spec.(*ast.ValueSpec)
		if !ok {
			continue
		}

		// Track the type name (may be specified only on first const in block)
		if vs.Type != nil {
			if id, ok := vs.Type.(*ast.Ident); ok {
				currentType = id.Name
			} else if callExpr, ok := vs.Type.(*ast.CallExpr); ok {
				// Handle ConnState(iota) pattern
				if fn, ok := callExpr.Fun.(*ast.Ident); ok {
					currentType = fn.Name
				}
			}
		}

		// Check if the value is a type conversion like ConnState(iota)
		if len(vs.Values) > 0 {
			if call, ok := vs.Values[0].(*ast.CallExpr); ok {
				if fn, ok := call.Fun.(*ast.Ident); ok {
					if currentType == "" {
						currentType = fn.Name
					}
				}
			}
		}

		if currentType == "" {
			continue
		}

		typeInfo, exists := r.types[currentType]
		if !exists {
			continue
		}

		for i, name := range vs.Names {
			if !name.IsExported() {
				continue
			}

			ev := EnumValue{Name: name.Name}

			// Try to extract string literal value
			if i < len(vs.Values) {
				if lit, ok := vs.Values[i].(*ast.BasicLit); ok && lit.Kind == token.STRING {
					ev.Value = strings.Trim(lit.Value, `"`)
				}
			}

			typeInfo.EnumValues = append(typeInfo.EnumValues, ev)
		}

		// If we found enum values, mark as enum
		if len(typeInfo.EnumValues) > 0 {
			typeInfo.Kind = TypeKindEnum
		}
	}
}

// Resolve returns the TypeInfo for a given name, or nil.
func (r *TypeRegistry) Resolve(name string) *TypeInfo {
	return r.types[name]
}

// -------------------------------------------------------------------
// JSON Schema structures
// -------------------------------------------------------------------

type JSONSchema struct {
	Schema               string                  `json:"$schema"`
	ID                   string                  `json:"$id"`
	Title                string                  `json:"title"`
	Description          string                  `json:"description,omitempty"`
	Type                 string                  `json:"type"`
	Properties           map[string]JSONProperty `json:"properties,omitempty"`
	Required             []string                `json:"required,omitempty"`
	Items                *JSONProperty           `json:"items,omitempty"`
	AdditionalProperties *JSONProperty           `json:"additionalProperties,omitempty"`
}

type JSONProperty struct {
	Type                 string                  `json:"type,omitempty"`
	Description          string                  `json:"description,omitempty"`
	Properties           map[string]JSONProperty `json:"properties,omitempty"`
	Items                *JSONProperty           `json:"items,omitempty"`
	AdditionalProperties *JSONProperty           `json:"additionalProperties,omitempty"`
	Required             []string                `json:"required,omitempty"`
	Format               string                  `json:"format,omitempty"`
	Enum                 []string                `json:"enum,omitempty"`
	Comment              string                  `json:"$comment,omitempty"`
}

// -------------------------------------------------------------------
// External types: cross-package types that can't be resolved from source
// -------------------------------------------------------------------

var externalTypes = map[string]JSONProperty{
	"time.Time":          {Type: "string", Format: "date-time"},
	"time.Duration":      {Type: "integer", Comment: "nanoseconds depicting a duration in time"},
	"jwt.TagList":        {Type: "array", Items: &JSONProperty{Type: "string"}},
	"jwt.AccountClaims":  {Type: "object", Description: "JWT account claims"},
	"jwt.ServiceLatency": {Type: "object", Description: "JWT service latency configuration"},
	"http.Header":        {Type: "object", Description: "HTTP headers", AdditionalProperties: &JSONProperty{Type: "array", Items: &JSONProperty{Type: "string"}}},
}

// Known int enum mappings for types that use iota + custom JSON marshaling
var knownIntEnumMappings = map[string][]string{
	"ConnState":        {"open", "closed", "all"},
	"HealthZErrorType": {"CONNECTION", "BAD_REQUEST", "JETSTREAM", "ACCOUNT", "STREAM", "CONSUMER"},
	"ServerCapability": nil, // Integer flags, no string enum
}

// -------------------------------------------------------------------
// Go type → JSON Schema conversion (using TypeRegistry)
// -------------------------------------------------------------------

func goTypeToJSONSchema(expr ast.Expr, registry *TypeRegistry, depth int) JSONProperty {
	return goTypeToJSONSchemaOpt(expr, registry, depth, false)
}

func goTypeToJSONSchemaOpt(expr ast.Expr, registry *TypeRegistry, depth int, allOptional bool) JSONProperty {
	if depth > 10 {
		return JSONProperty{Type: "object"}
	}

	switch t := expr.(type) {
	case *ast.Ident:
		return resolveIdent(t.Name, registry, depth, allOptional)
	case *ast.ArrayType:
		itemProp := goTypeToJSONSchemaOpt(t.Elt, registry, depth+1, allOptional)
		return JSONProperty{Type: "array", Items: &itemProp}
	case *ast.MapType:
		valProp := goTypeToJSONSchemaOpt(t.Value, registry, depth+1, allOptional)
		return JSONProperty{Type: "object", AdditionalProperties: &valProp}
	case *ast.StarExpr:
		return goTypeToJSONSchemaOpt(t.X, registry, depth, allOptional)
	case *ast.SelectorExpr:
		return resolveSelectorExpr(t)
	case *ast.InterfaceType:
		return JSONProperty{Type: "object"}
	}
	return JSONProperty{Type: "string"}
}

func resolveIdent(name string, registry *TypeRegistry, depth int, allOptional bool) JSONProperty {
	// Primitives
	switch name {
	case "string":
		return JSONProperty{Type: "string"}
	case "int", "int8", "int16", "int32", "int64",
		"uint", "uint8", "uint16", "uint32", "uint64":
		return JSONProperty{Type: "integer"}
	case "float32", "float64":
		return JSONProperty{Type: "number"}
	case "bool":
		return JSONProperty{Type: "boolean"}
	case "byte":
		return JSONProperty{Type: "integer"}
	case "error":
		return JSONProperty{Type: "string", Description: "Error message, if any"}
	}

	// Check registry
	info := registry.Resolve(name)
	if info == nil {
		unresolvedTypes = append(unresolvedTypes, name)
		return JSONProperty{Type: "object"}
	}

	switch info.Kind {
	case TypeKindEnum:
		return resolveEnum(info)
	case TypeKindStruct:
		return resolveStruct(info, registry, depth, allOptional)
	case TypeKindMap:
		if mt, ok := info.Underlying.(*ast.MapType); ok {
			valProp := goTypeToJSONSchemaOpt(mt.Value, registry, depth+1, allOptional)
			return JSONProperty{Type: "object", AdditionalProperties: &valProp}
		}
		return JSONProperty{Type: "object"}
	case TypeKindAlias:
		// Resolve the underlying type
		return goTypeToJSONSchemaOpt(info.Underlying, registry, depth+1, allOptional)
	}

	return JSONProperty{Type: "object"}
}

func resolveEnum(info *TypeInfo) JSONProperty {
	// Check if it's a known int enum with string mappings
	if mappings, ok := knownIntEnumMappings[info.Name]; ok {
		if mappings != nil {
			return JSONProperty{Type: "string", Enum: mappings}
		}
		return JSONProperty{Type: "integer"}
	}

	// String enum: extract values
	var enumValues []string
	for _, ev := range info.EnumValues {
		if ev.Value != "" {
			enumValues = append(enumValues, ev.Value)
		}
	}
	if len(enumValues) > 0 {
		return JSONProperty{Type: "string", Enum: enumValues}
	}

	return JSONProperty{Type: "string"}
}

func resolveStruct(info *TypeInfo, registry *TypeRegistry, depth int, allOptional bool) JSONProperty {
	props, required := buildStructProperties(info, registry, depth+1, allOptional)
	prop := JSONProperty{
		Type:       "object",
		Properties: props,
	}
	if len(required) > 0 {
		prop.Required = required
	}
	return prop
}

func resolveSelectorExpr(sel *ast.SelectorExpr) JSONProperty {
	pkgIdent, ok := sel.X.(*ast.Ident)
	if !ok {
		return JSONProperty{Type: "object"}
	}

	key := pkgIdent.Name + "." + sel.Sel.Name
	if prop, ok := externalTypes[key]; ok {
		return prop
	}

	unresolvedTypes = append(unresolvedTypes, key)
	return JSONProperty{Type: "object"}
}

// -------------------------------------------------------------------
// Struct → JSON Schema properties (handles embedding + required fields)
// -------------------------------------------------------------------

func buildStructProperties(info *TypeInfo, registry *TypeRegistry, depth int, allOptional bool) (map[string]JSONProperty, []string) {
	if depth > 10 {
		fmt.Printf("  [depth-limit] Truncating at depth %d for type %s\n", depth, info.Name)
		return nil, nil
	}

	props := make(map[string]JSONProperty)
	var required []string

	for _, field := range info.Fields {
		if field.Embedded {
			// Resolve embedded struct and merge its fields
			embeddedInfo := registry.Resolve(field.Name)
			if embeddedInfo == nil {
				unresolvedTypes = append(unresolvedTypes, field.Name+" (embedded)")
			} else if embeddedInfo.Kind == TypeKindStruct {
				embProps, embRequired := buildStructProperties(embeddedInfo, registry, depth+1, allOptional)
				for k, v := range embProps {
					props[k] = v
				}
				required = append(required, embRequired...)
			}
			continue
		}

		jsonName := field.JSONName
		if jsonName == "" {
			// Match encoding/json: use exact Go field name when no json tag
			jsonName = field.Name
		}

		prop := goTypeToJSONSchemaOpt(field.Type, registry, depth, allOptional)

		if field.Description != "" {
			prop.Description = field.Description
		}

		props[jsonName] = prop

		// Fields without omitempty/omitzero are required (but not for request schemas)
		if !allOptional && !field.OmitEmpty && !field.OmitZero && jsonName != "" {
			required = append(required, jsonName)
		}
	}

	sort.Strings(required)
	return props, required
}

// -------------------------------------------------------------------
// Monitor endpoint definitions
// -------------------------------------------------------------------

type MonitorEndpoint struct {
	Name           string
	OptionsStruct  string
	ResponseStruct string
}

func getMonitorEndpoints() []MonitorEndpoint {
	return []MonitorEndpoint{
		// Note: varz response comes from jsm.go, only generate request schema
		{Name: "varz", OptionsStruct: "VarzOptions", ResponseStruct: ""},
		{Name: "connz", OptionsStruct: "ConnzOptions", ResponseStruct: "Connz"},
		{Name: "routez", OptionsStruct: "RoutezOptions", ResponseStruct: "Routez"},
		{Name: "subsz", OptionsStruct: "SubszOptions", ResponseStruct: "Subsz"},
		{Name: "gatewayz", OptionsStruct: "GatewayzOptions", ResponseStruct: "Gatewayz"},
		{Name: "leafz", OptionsStruct: "LeafzOptions", ResponseStruct: "Leafz"},
		{Name: "accountz", OptionsStruct: "AccountzOptions", ResponseStruct: "Accountz"},
		{Name: "jsz", OptionsStruct: "JSzOptions", ResponseStruct: "JSInfo"},
		{Name: "healthz", OptionsStruct: "HealthzOptions", ResponseStruct: "HealthStatus"},
		{Name: "profilez", OptionsStruct: "ProfilezOptions", ResponseStruct: "ProfilezStatus"},
		{Name: "ipqueuesz", OptionsStruct: "IpqueueszOptions", ResponseStruct: "IpqueueszStatus"},
		{Name: "raftz", OptionsStruct: "RaftzOptions", ResponseStruct: "RaftzStatus"},
		{Name: "accstatz", OptionsStruct: "AccountStatzOptions", ResponseStruct: "AccountStatz"},
		{Name: "statsz", OptionsStruct: "StatszEventOptions", ResponseStruct: "ServerStats"},
		{Name: "idz", OptionsStruct: "", ResponseStruct: "ServerInfo"},
	}
}

// -------------------------------------------------------------------
// Schema generation from TypeRegistry
// -------------------------------------------------------------------

func generateMonitorSchemas(schemasDir string, registry *TypeRegistry, dryRun bool) error {
	endpoints := getMonitorEndpoints()

	if !dryRun {
		if err := os.MkdirAll(schemasDir, 0755); err != nil {
			return fmt.Errorf("failed to create schemas directory: %w", err)
		}
	}

	for _, ep := range endpoints {
		// Generate request schema
		if ep.OptionsStruct != "" {
			info := registry.Resolve(ep.OptionsStruct)
			if info != nil && info.Kind == TypeKindStruct {
				schema := typeInfoToSchema(info, registry, ep.Name, "request")
				filename := filepath.Join(schemasDir, ep.Name+"_request.json")
				if err := writeJSONSchema(schema, filename, dryRun); err != nil {
					return err
				}
			} else {
				fmt.Printf("Warning: Options struct %s not found for %s\n", ep.OptionsStruct, ep.Name)
			}
		}

		// Generate response schema
		if ep.ResponseStruct != "" {
			info := registry.Resolve(ep.ResponseStruct)
			if info != nil {
				var schema JSONSchema
				switch info.Kind {
				case TypeKindStruct:
					schema = typeInfoToSchema(info, registry, ep.Name, "response")
				case TypeKindMap:
					schema = mapTypeInfoToSchema(info, registry, ep.Name, "response")
				default:
					schema = typeInfoToSchema(info, registry, ep.Name, "response")
				}
				filename := filepath.Join(schemasDir, ep.Name+"_response.json")
				if err := writeJSONSchema(schema, filename, dryRun); err != nil {
					return err
				}
			} else {
				fmt.Printf("Warning: Response struct %s not found for %s\n", ep.ResponseStruct, ep.Name)
			}
		}
	}

	return nil
}

func typeInfoToSchema(info *TypeInfo, registry *TypeRegistry, endpointName, schemaType string) JSONSchema {
	allOptional := schemaType == "request"
	props, required := buildStructProperties(info, registry, 0, allOptional)

	schema := JSONSchema{
		Schema:     "http://json-schema.org/draft-07/schema#",
		ID:         fmt.Sprintf("https://nats.io/schemas/server/monitor/v1/%s_%s.json", endpointName, schemaType),
		Title:      fmt.Sprintf("io.nats.server.monitor.v1.%s_%s", endpointName, schemaType),
		Type:       "object",
		Properties: props,
	}

	if schemaType == "request" {
		schema.Description = fmt.Sprintf("Request options for %s monitoring endpoint", endpointName)
	} else {
		schema.Description = fmt.Sprintf("Response from %s monitoring endpoint", endpointName)
	}

	if len(required) > 0 {
		schema.Required = required
	}

	return schema
}

func mapTypeInfoToSchema(info *TypeInfo, registry *TypeRegistry, endpointName, schemaType string) JSONSchema {
	schema := JSONSchema{
		Schema: "http://json-schema.org/draft-07/schema#",
		ID:     fmt.Sprintf("https://nats.io/schemas/server/monitor/v1/%s_%s.json", endpointName, schemaType),
		Title:  fmt.Sprintf("io.nats.server.monitor.v1.%s_%s", endpointName, schemaType),
		Type:   "object",
	}

	if schemaType == "request" {
		schema.Description = fmt.Sprintf("Request options for %s monitoring endpoint", endpointName)
	} else {
		schema.Description = fmt.Sprintf("Response from %s monitoring endpoint", endpointName)
	}

	if mt, ok := info.Underlying.(*ast.MapType); ok {
		allOptional := schemaType == "request"
		valProp := goTypeToJSONSchemaOpt(mt.Value, registry, 0, allOptional)
		schema.AdditionalProperties = &valProp
	}

	return schema
}

// -------------------------------------------------------------------
// JetStream Error structures and parsing (kept from original)
// -------------------------------------------------------------------

type JSError struct {
	Constant    string `json:"constant"`
	Code        int    `json:"code"`
	ErrorCode   int    `json:"error_code"`
	Description string `json:"description"`
	Comment     string `json:"comment"`
	Help        string `json:"help"`
	URL         string `json:"url"`
	Deprecates  string `json:"deprecates"`
}

type ErrorCategory struct {
	Name   string
	Errors []JSError
}

func categorizeJSErrors(errors []JSError) []ErrorCategory {
	categories := make(map[string][]JSError)
	categoryOrder := []string{
		"Account", "General", "Clustering", "Consumer", "Stream",
		"Mirror", "Source", "Message", "Atomic Publish",
	}

	for _, err := range errors {
		prefix := err.Constant
		var category string

		switch {
		case strings.Contains(prefix, "Account"):
			category = "Account Errors"
		case strings.Contains(prefix, "Cluster"):
			category = "Clustering Errors"
		case strings.Contains(prefix, "Consumer"):
			category = "Consumer Errors"
		case strings.Contains(prefix, "Stream") && !strings.Contains(prefix, "Mirror") && !strings.Contains(prefix, "Source"):
			category = "Stream Errors"
		case strings.Contains(prefix, "Mirror"):
			category = "Mirror Errors"
		case strings.Contains(prefix, "Source"):
			category = "Source Errors"
		case strings.Contains(prefix, "Message"):
			category = "Message Errors"
		case strings.Contains(prefix, "AtomicPublish"):
			category = "Atomic Publish Errors"
		default:
			category = "General Errors"
		}

		categories[category] = append(categories[category], err)
	}

	for _, errs := range categories {
		sort.Slice(errs, func(i, j int) bool {
			return errs[i].ErrorCode < errs[j].ErrorCode
		})
	}

	var result []ErrorCategory
	for _, name := range categoryOrder {
		fullName := name + " Errors"
		if errs, ok := categories[fullName]; ok {
			result = append(result, ErrorCategory{Name: fullName, Errors: errs})
			delete(categories, fullName)
		}
	}
	// Collect remaining categories in sorted order for deterministic output
	var remaining []string
	for name := range categories {
		remaining = append(remaining, name)
	}
	sort.Strings(remaining)
	for _, name := range remaining {
		result = append(result, ErrorCategory{Name: name, Errors: categories[name]})
	}

	return result
}

// wrapMDXCurlyBraces wraps {placeholder} and {{template}} patterns in backtick
// code spans so MDX doesn't interpret them as JSX expressions.
var curlyBracePattern = regexp.MustCompile(`\{{1,2}[a-zA-Z_()]+\}{1,2}`)

func wrapMDXCurlyBraces(s string) string {
	return curlyBracePattern.ReplaceAllStringFunc(s, func(m string) string {
		if strings.HasPrefix(m, "`") {
			return m
		}
		return "`" + m + "`"
	})
}

// escapeMDX wraps tokens containing characters that MDX would interpret as JSX
// (angle brackets, curly braces) in backtick code spans.
var angleBracketExpr = regexp.MustCompile(`\S*[<>]\S*`)

func escapeMDX(s string) string {
	s = wrapMDXCurlyBraces(s)
	s = angleBracketExpr.ReplaceAllStringFunc(s, func(m string) string {
		// Don't double-wrap if already in backticks
		if strings.HasPrefix(m, "`") {
			return m
		}
		return "`" + m + "`"
	})
	return s
}

func parseJSErrors(serverPath string) ([]ErrorCategory, error) {
	path := filepath.Join(serverPath, errorsJSONPath)
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read errors.json: %w", err)
	}

	var errors []JSError
	if err := json.Unmarshal(data, &errors); err != nil {
		return nil, fmt.Errorf("failed to parse errors.json: %w", err)
	}

	for i := range errors {
		errors[i].Description = wrapMDXCurlyBraces(errors[i].Description)
	}

	return categorizeJSErrors(errors), nil
}

// -------------------------------------------------------------------
// System Error structures and AST-based parsing
// -------------------------------------------------------------------

type SystemError struct {
	Name        string // Go constant name (e.g., "ErrTooManyConnections")
	DisplayName string // User-facing error string (e.g., "Maximum Connections Exceeded")
	Description string // Description from doc comment
}

type SystemErrorCategory struct {
	Name   string
	Errors []SystemError
}

// parseSystemErrors extracts error variables from errors.go using AST parsing.
// It reads doc comments above each error variable for the description.
func parseSystemErrors(serverPath string) ([]SystemErrorCategory, error) {
	path := filepath.Join(serverPath, errorsGoPath)

	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
	if err != nil {
		return nil, fmt.Errorf("failed to parse %s: %w", path, err)
	}

	var allErrors []SystemError

	for _, decl := range file.Decls {
		genDecl, ok := decl.(*ast.GenDecl)
		if !ok || genDecl.Tok != token.VAR {
			continue
		}

		for _, spec := range genDecl.Specs {
			vs, ok := spec.(*ast.ValueSpec)
			if !ok {
				continue
			}

			for _, name := range vs.Names {
				if !strings.HasPrefix(name.Name, "Err") {
					continue
				}

				// Extract user-facing error string
				errorString := extractErrorString(vs)
				displayName := ""
				if errorString != "" {
					// Strip Go error wrapping prefix (%w: )
					errorString = strings.TrimPrefix(errorString, "%w: ")
					displayName = capitalize(errorString)
				}

				// Extract description from doc comment
				var description string
				if vs.Doc != nil {
					description = cleanComment(vs.Doc.Text())
					// Strip the "ErrFoo represents ..." prefix
					description = cleanDocCommentDesc(name.Name, description)
				} else if vs.Comment != nil {
					description = cleanComment(vs.Comment.Text())
					description = cleanDocCommentDesc(name.Name, description)
				}

				// If no doc comment, use the error string as description
				if description == "" && displayName != "" {
					description = displayName
				}

				allErrors = append(allErrors, SystemError{
					Name:        name.Name,
					DisplayName: escapeMDX(displayName),
					Description: escapeMDX(description),
				})
			}
		}
	}

	return categorizeSystemErrors(allErrors), nil
}

// extractErrorString extracts the string argument from errors.New("...") or fmt.Errorf("...", ...)
func extractErrorString(vs *ast.ValueSpec) string {
	if len(vs.Values) == 0 {
		return ""
	}

	call, ok := vs.Values[0].(*ast.CallExpr)
	if !ok {
		return ""
	}

	if len(call.Args) == 0 {
		return ""
	}

	// First arg should be a string literal
	lit, ok := call.Args[0].(*ast.BasicLit)
	if !ok || lit.Kind != token.STRING {
		return ""
	}

	return strings.Trim(lit.Value, `"`)
}

// categorizeSystemErrors groups system errors into categories based on patterns.
func categorizeSystemErrors(errors []SystemError) []SystemErrorCategory {
	type categoryDef struct {
		Name    string
		Matches func(string) bool
	}

	categories := []categoryDef{
		{"Authentication and Authorization Errors", func(n string) bool {
			return strings.Contains(n, "Auth") || strings.Contains(n, "Permissions") || strings.Contains(n, "Revocation")
		}},
		{"Connection Limit Errors", func(n string) bool {
			return (strings.Contains(n, "TooMany") && !strings.Contains(n, "Mapping") && !strings.Contains(n, "SubTokens")) ||
				strings.Contains(n, "Maximum") || strings.Contains(n, "Throttl")
		}},
		{"Protocol and Payload Errors", func(n string) bool {
			return strings.Contains(n, "MaxPayload") || strings.Contains(n, "MaxControl") ||
				strings.Contains(n, "Protocol") || strings.Contains(n, "Parser") ||
				strings.Contains(n, "Header") || strings.Contains(n, "Responders") ||
				strings.Contains(n, "BadClient")
		}},
		{"Subject and Publishing Errors", func(n string) bool {
			return strings.Contains(n, "BadSubject") || strings.Contains(n, "InvalidSubject") ||
				strings.Contains(n, "BadPublish") || strings.Contains(n, "InvalidPublish") ||
				strings.Contains(n, "Reserved") || strings.Contains(n, "Malformed") ||
				strings.Contains(n, "InvalidSubscription") || strings.Contains(n, "SubTokens") ||
				strings.Contains(n, "BadQualifier") || strings.Contains(n, "NoTransforms") ||
				strings.Contains(n, "Mapping")
		}},
		{"TLS and Security Errors", func(n string) bool {
			return strings.Contains(n, "TLS") || strings.Contains(n, "Secure") ||
				strings.Contains(n, "Cert") || strings.Contains(n, "Proxy")
		}},
		{"Account Errors", func(n string) bool {
			return strings.Contains(n, "Account") || strings.Contains(n, "Service") ||
				strings.Contains(n, "StreamImport") || strings.Contains(n, "ServiceImport") ||
				strings.Contains(n, "Import") || strings.Contains(n, "Sampling")
		}},
		{"Server Name and Cluster Errors", func(n string) bool {
			return strings.Contains(n, "Duplicate") || strings.Contains(n, "ClusterName") ||
				strings.Contains(n, "ServerName") || strings.Contains(n, "Spaces")
		}},
		{"Wrong Port Connection Errors", func(n string) bool {
			return strings.Contains(n, "ConnectedTo") || strings.Contains(n, "WrongPort")
		}},
		{"Route-Specific Errors", func(n string) bool {
			return strings.Contains(n, "Route")
		}},
		{"Gateway-Specific Errors", func(n string) bool {
			return strings.Contains(n, "Gateway")
		}},
		{"Leafnode-Specific Errors", func(n string) bool {
			return strings.Contains(n, "Leaf")
		}},
		{"Slow Consumer and Flow Control", func(n string) bool {
			return strings.Contains(n, "Slow") || strings.Contains(n, "WriteDeadline") || strings.Contains(n, "Stall")
		}},
		{"Connection State Errors", func(n string) bool {
			return strings.Contains(n, "ConnectionClosed") || strings.Contains(n, "Stale") || strings.Contains(n, "NotRunning")
		}},
	}

	result := make([]SystemErrorCategory, 0)
	used := make(map[string]bool)

	for _, cat := range categories {
		var catErrors []SystemError
		for _, sysErr := range errors {
			if cat.Matches(sysErr.Name) && !used[sysErr.Name] {
				catErrors = append(catErrors, sysErr)
				used[sysErr.Name] = true
			}
		}
		if len(catErrors) > 0 {
			sort.Slice(catErrors, func(i, j int) bool {
				return catErrors[i].Name < catErrors[j].Name
			})
			result = append(result, SystemErrorCategory{
				Name:   cat.Name,
				Errors: catErrors,
			})
		}
	}

	// Collect uncategorized errors
	var uncategorized []SystemError
	for _, sysErr := range errors {
		if !used[sysErr.Name] {
			uncategorized = append(uncategorized, sysErr)
		}
	}
	if len(uncategorized) > 0 {
		sort.Slice(uncategorized, func(i, j int) bool {
			return uncategorized[i].Name < uncategorized[j].Name
		})
		result = append(result, SystemErrorCategory{
			Name:   "Other Errors",
			Errors: uncategorized,
		})
	}

	return result
}

// supplementalErrors provides protocol-level errors that are sent as -ERR messages
// to clients but don't have corresponding Err* variable declarations in errors.go.
// These are hand-curated to match runtime error strings from the server source.
var supplementalErrors = []struct {
	Name        string
	Description string
	Category    string
}{
	// Authentication and Authorization
	{"Authorization Violation", "Client attempted an operation that violates configured permissions", "Authentication and Authorization Errors"},
	{"Authentication Timeout", "Client failed to authenticate within the configured timeout period", "Authentication and Authorization Errors"},
	{"User Authentication Expired", "User JWT or credentials have expired", "Authentication and Authorization Errors"},
	{"Account Authentication Expired", "Account authentication has expired", "Authentication and Authorization Errors"},
	{"User Authentication Revoked", "User credentials have been revoked", "Authentication and Authorization Errors"},
	{"Permissions Violation for Publish", "Client attempted to publish to a subject without permission", "Authentication and Authorization Errors"},
	{"Permissions Violation for Subscription", "Client attempted to subscribe to a subject without permission", "Authentication and Authorization Errors"},
	// Connection Limits
	{"Connection Throttling Is Active", "Server is actively throttling new connections", "Connection Limit Errors"},
	{"Maximum Clients Exceeded", "Server has reached its maximum number of allowed clients", "Connection Limit Errors"},
	// Protocol and Payload
	{"Maximum Payload Violation", "Published message exceeds the configured maximum payload size", "Protocol and Payload Errors"},
	// Subject and Publishing
	{"Invalid Subscription", "Subscription request is invalid", "Subject and Publishing Errors"},
	// TLS and Security
	{"Secure Connection - TLS Required", "Server requires TLS but client attempted non-TLS connection", "TLS and Security Errors"},
	// Route
	{"Route Authorization Violation", "Route connection failed authorization", "Route-Specific Errors"},
	// Gateway
	{"Connection to Gateway Rejected", "Gateway rejected the connection", "Gateway-Specific Errors"},
	// Account
	{"Failed Account Registration", "Failed to register client with account", "Account Errors"},
	// Protocol and Payload (runtime errors without Err* constants)
	{"Protocol Violation", "Client violated the NATS protocol", "Protocol and Payload Errors"},
	{"Parser Error", "Server encountered an error parsing client protocol", "Protocol and Payload Errors"},
	// TLS and Security
	{"TLS Handshake Error", "TLS handshake with client failed", "TLS and Security Errors"},
	// Route
	{"Duplicate Route", "Route connection already exists to this server", "Route-Specific Errors"},
	// Slow Consumer and Flow Control
	{"Slow Consumer Detected", "Server detected a slow consumer that is not keeping up with message delivery", "Slow Consumer and Flow Control"},
	{"Consumer Is Slow", "Consumer is processing messages too slowly", "Slow Consumer and Flow Control"},
	{"Write Deadline Exceeded", "Write operation to client exceeded the configured deadline", "Slow Consumer and Flow Control"},
	// Connection State
	{"Stale Connection", "Connection is stale and will be closed", "Connection State Errors"},
	// Configuration and Resolver
	{"Account Resolver Missing", "No account resolver configured for this server", "Configuration and Resolver Errors"},
	{"Account Resolver Update Too Soon", "Account resolver update attempted before the minimum interval", "Configuration and Resolver Errors"},
	{"Account Resolver No New Claims", "Account resolver received same claims, no update needed", "Configuration and Resolver Errors"},
	{"System Account Not Setup", "System account has not been configured on this server", "Configuration and Resolver Errors"},
	{"Credentials Have Been Revoked", "The supplied credentials have been revoked", "Configuration and Resolver Errors"},
}

// mergeSupplementalErrors adds curated protocol-level errors into the categorized
// system errors list. It merges into existing categories or creates new ones.
func mergeSupplementalErrors(categories []SystemErrorCategory) []SystemErrorCategory {
	catMap := make(map[string]int)
	for i, cat := range categories {
		catMap[cat.Name] = i
	}

	// Build a set of existing display names (case-insensitive) to avoid duplicates
	existingDisplayNames := make(map[string]bool)
	for _, cat := range categories {
		for _, e := range cat.Errors {
			if e.DisplayName != "" {
				existingDisplayNames[strings.ToLower(e.DisplayName)] = true
			}
		}
	}

	for _, se := range supplementalErrors {
		// Skip if an error with this display name already exists from Go constants
		if existingDisplayNames[strings.ToLower(se.Name)] {
			continue
		}
		entry := SystemError{
			Name:        se.Name,
			DisplayName: se.Name,
			Description: se.Description,
		}
		if idx, ok := catMap[se.Category]; ok {
			categories[idx].Errors = append(categories[idx].Errors, entry)
		} else {
			categories = append(categories, SystemErrorCategory{
				Name:   se.Category,
				Errors: []SystemError{entry},
			})
			catMap[se.Category] = len(categories) - 1
		}
	}

	return categories
}

// -------------------------------------------------------------------
// ClosedState parsing: connection close reasons from nats-server
// -------------------------------------------------------------------

type ClosedStateEntry struct {
	ConstName   string // e.g. "SlowConsumerPendingBytes"
	Description string // e.g. "Slow Consumer (Pending Bytes)"
}

// parseClosedStates extracts ClosedState enum constants from server/client.go
// and their human-readable descriptions from the String() method in server/monitor.go.
func parseClosedStates(serverPath string) ([]ClosedStateEntry, error) {
	// Step 1: Parse client.go to get the ordered list of ClosedState constants
	clientPath := filepath.Join(serverPath, "server/client.go")
	fset := token.NewFileSet()
	clientFile, err := parser.ParseFile(fset, clientPath, nil, parser.ParseComments)
	if err != nil {
		return nil, fmt.Errorf("failed to parse client.go: %w", err)
	}

	var constNames []string
	for _, decl := range clientFile.Decls {
		genDecl, ok := decl.(*ast.GenDecl)
		if !ok || genDecl.Tok != token.CONST {
			continue
		}

		// Look for the const block containing ClosedState(iota
		isClosedStateBlock := false
		for _, spec := range genDecl.Specs {
			vs, ok := spec.(*ast.ValueSpec)
			if !ok {
				continue
			}

			// Detect the first entry: ClientClosed = ClosedState(iota + 1)
			if !isClosedStateBlock {
				if vs.Type != nil {
					if call, ok := vs.Type.(*ast.CallExpr); ok {
						if fn, ok := call.Fun.(*ast.Ident); ok && fn.Name == "ClosedState" {
							isClosedStateBlock = true
						}
					}
				}
				if !isClosedStateBlock && len(vs.Values) > 0 {
					if call, ok := vs.Values[0].(*ast.CallExpr); ok {
						if fn, ok := call.Fun.(*ast.Ident); ok && fn.Name == "ClosedState" {
							isClosedStateBlock = true
						}
					}
				}
			}

			if isClosedStateBlock {
				for _, name := range vs.Names {
					if name.IsExported() {
						constNames = append(constNames, name.Name)
					}
				}
			}
		}

		if isClosedStateBlock {
			break // Found the block, stop looking
		}
	}

	if len(constNames) == 0 {
		return nil, fmt.Errorf("no ClosedState constants found in client.go")
	}

	// Step 2: Parse monitor.go to get the String() mappings
	monitorPath := filepath.Join(serverPath, "server/monitor.go")
	mfset := token.NewFileSet()
	monitorFile, err := parser.ParseFile(mfset, monitorPath, nil, parser.ParseComments)
	if err != nil {
		return nil, fmt.Errorf("failed to parse monitor.go: %w", err)
	}

	stringMap := make(map[string]string)
	for _, decl := range monitorFile.Decls {
		funcDecl, ok := decl.(*ast.FuncDecl)
		if !ok || funcDecl.Name.Name != "String" {
			continue
		}
		// Check it's a method on ClosedState
		if funcDecl.Recv == nil || len(funcDecl.Recv.List) == 0 {
			continue
		}
		recvType := funcDecl.Recv.List[0].Type
		var typeName string
		if id, ok := recvType.(*ast.Ident); ok {
			typeName = id.Name
		} else if star, ok := recvType.(*ast.StarExpr); ok {
			if id, ok := star.X.(*ast.Ident); ok {
				typeName = id.Name
			}
		}
		if typeName != "ClosedState" {
			continue
		}

		// Walk the function body looking for switch/case statements
		ast.Inspect(funcDecl.Body, func(n ast.Node) bool {
			caseClause, ok := n.(*ast.CaseClause)
			if !ok || len(caseClause.List) == 0 {
				return true
			}

			// Extract the constant name from the case
			var caseName string
			for _, expr := range caseClause.List {
				if id, ok := expr.(*ast.Ident); ok {
					caseName = id.Name
					break
				}
			}
			if caseName == "" {
				return true
			}

			// Extract the return string
			for _, stmt := range caseClause.Body {
				retStmt, ok := stmt.(*ast.ReturnStmt)
				if !ok || len(retStmt.Results) == 0 {
					continue
				}
				if lit, ok := retStmt.Results[0].(*ast.BasicLit); ok && lit.Kind == token.STRING {
					stringMap[caseName] = strings.Trim(lit.Value, `"`)
				}
			}

			return true
		})
		break // Found the String() method
	}

	// Step 3: Build the result list in enum declaration order
	var entries []ClosedStateEntry
	for _, name := range constNames {
		desc, ok := stringMap[name]
		if !ok {
			desc = name // Fallback to the constant name
		}
		entries = append(entries, ClosedStateEntry{
			ConstName:   name,
			Description: desc,
		})
	}

	return entries, nil
}

// -------------------------------------------------------------------
// Header structures and parsing (with inline comment extraction)
// -------------------------------------------------------------------

type Header struct {
	Name        string
	ValueType   string
	Description string
}

type HeaderSubsection struct {
	Name        string
	Description string
	Headers     []Header
}

type HeaderSection struct {
	Name        string
	Description string
	Headers     []Header
	Subsections []HeaderSubsection
}

// parseHeaders extracts header constants from multiple nats-server source files.
// Uses AST parsing to extract both doc comments and inline comments.
func parseHeaders(serverPath string) ([]HeaderSection, error) {
	sections := make(map[string][]Header)
	sectionOrder := []string{
		"Message Publishing Headers",
		"Message Delivery Headers",
		"API Headers",
		"Marker Headers",
		"Authentication and Authorization Headers",
		"Message Tracing Headers",
		"Key-Value Store Headers",
	}

	for _, sourceFile := range headerSourceFiles {
		path := filepath.Join(serverPath, sourceFile)

		fset := token.NewFileSet()
		file, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			fmt.Printf("Warning: Could not parse %s: %v\n", sourceFile, err)
			continue
		}

		ast.Inspect(file, func(n ast.Node) bool {
			genDecl, ok := n.(*ast.GenDecl)
			if !ok || (genDecl.Tok != token.CONST && genDecl.Tok != token.VAR) {
				return true
			}

			// Get block-level doc comment
			var blockDoc string
			if genDecl.Doc != nil {
				blockDoc = cleanComment(genDecl.Doc.Text())
			}

			for _, spec := range genDecl.Specs {
				valueSpec, ok := spec.(*ast.ValueSpec)
				if !ok {
					continue
				}

				for i, name := range valueSpec.Names {
					if len(valueSpec.Values) <= i {
						continue
					}

					basicLit, ok := valueSpec.Values[i].(*ast.BasicLit)
					if !ok || basicLit.Kind != token.STRING {
						continue
					}

					headerValue := strings.Trim(basicLit.Value, `"`)
					if !strings.HasPrefix(headerValue, "Nats-") && !strings.HasPrefix(headerValue, "KV-") {
						continue
					}

					// Extract description: override map > spec doc > spec inline comment > block doc
					// The override map takes priority to fix cases where Go doc comments
					// leak constant names or are otherwise unsuitable for documentation.
					description := headerDescriptionFallback(name.Name)
					if description == "" {
						if valueSpec.Doc != nil {
							description = cleanComment(valueSpec.Doc.Text())
						} else if valueSpec.Comment != nil {
							description = cleanComment(valueSpec.Comment.Text())
						} else if blockDoc != "" && len(genDecl.Specs) == 1 {
							description = blockDoc
						}
					}

					header := Header{
						Name:        headerValue,
						ValueType:   headerValueType(name.Name),
						Description: description,
					}

					sectionName, subsectionName := categorizeHeaderWithSubsection(headerValue)
					key := sectionName
					if subsectionName != "" {
						key = sectionName + "|" + subsectionName
					}
					sections[key] = append(sections[key], header)
				}
			}

			return true
		})
	}

	return buildHeaderSections(sections, sectionOrder), nil
}

// headerValueTypeOverrides provides exact type mappings for headers where
// pattern-based matching would produce incorrect or overly generic results.
var headerValueTypeOverrides = map[string]string{
	"JSTimeStamp":               "RFC3339 timestamp",
	"JSConsumerStalled":         "Reply subject",
	"JSMsgRollup":               "`sub` or `all`",
	"JSNumPending":              "Count",
	"JSPullRequestPendingMsgs":  "Count",
	"JSPullRequestPendingBytes": "Size in bytes",
	"JSMarkerReason":            "`MaxAge`, `Purge`, or `Remove`",
	"JSBatchCommit":             "`1`",
	"JSBatchId":                 "Batch ID",
	"JSResponseType":            "Response type string",
	"MsgTraceDest":              "Subject",
	"MsgTraceHop":               "Hop count",
	"MsgTraceOriginAccount":     "Account name",
	"MsgTraceOnly":              "Boolean flag",
	"ClientInfoHdr":             "JSON-encoded client info",
	"AuthRequestXKeyHeader":     "X-Key string",
	"JSMsgId":                   "Unique message ID",
	"JSExpectedStream":          "Stream name",
	"JSExpectedLastMsgId":       "Message ID",
	"JSExpectedLastSubjSeqSubj": "Subject",
	"JSStreamSource":            "Stream source info",
	"JSRequiredApiLevel":        "API level number",
	"JSStream":                  "Stream name",
	"JSSubject":                 "Subject",
	"JSUpToSequence":            "Sequence number",
	"JSPullRequestNatsPinId":    "NUID",
	"JSSchedulePattern":         "Cron expression",
	"JSScheduleTarget":          "Subject",
	"JSScheduler":               "Scheduler ID",
	"JSScheduleNext":            "RFC3339 timestamp or `purge`",
	"JSMessageTTL":              "Duration string (e.g., `60s`, `5m`)",
	"JSScheduleTTL":             "Duration string (e.g., `60s`, `5m`)",
	"KVOperation":               "`PUT`, `DEL`, or `PURGE`",
	"JSMessageCounterSources":   "JSON",
	"JSScheduleSource":          "Subject",
}

// headerValueType derives the value type from the constant name.
// It checks exact overrides first, then falls back to reliable pattern matching.
func headerValueType(constName string) string {
	if vt, ok := headerValueTypeOverrides[constName]; ok {
		return vt
	}
	switch {
	case strings.Contains(constName, "Seq"):
		return "Sequence number"
	case strings.Contains(constName, "TTL"):
		return "Duration"
	case strings.Contains(constName, "Size"):
		return "Size in bytes"
	case strings.Contains(constName, "Incr"):
		return "Number"
	default:
		return "String"
	}
}

// headerDescriptionFallback provides descriptions for headers that lack source comments.
// This is used only when AST comment extraction yields nothing.
var headerDescriptionData = map[string]string{
	"JSMsgId":                   "Unique message ID for deduplication. Messages with the same ID within the deduplication window will be rejected as duplicates.",
	"JSExpectedStream":          "Verifies the message is being published to the expected stream",
	"JSExpectedLastSeq":         "Message will only be stored if the stream's last sequence matches this value",
	"JSExpectedLastSubjSeq":     "Message will only be stored if the last sequence for this subject matches this value",
	"JSExpectedLastSubjSeqSubj": "Specifies the subject for the expected last subject sequence check",
	"JSExpectedLastMsgId":       "Message will only be stored if the last message ID matches this value",
	"JSStreamSource":            "Information about the source stream in format: stream-name > seq > subject",
	"JSLastConsumerSeq":         "Consumer's last delivered sequence",
	"JSLastStreamSeq":           "Stream's last sequence at delivery time",
	"JSConsumerStalled":         "Indicates consumer is stalled with delivery count",
	"JSMsgRollup":               "Indicates this message should replace previous messages. `sub` replaces all previous messages on the same subject, `all` replaces all messages in the stream",
	"JSMsgSize":                 "Indicates the size of the message payload",
	"JSResponseType":            "Type of response being sent",
	"JSMessageTTL":              "Time-to-live for the message. Message will be automatically removed after this duration",
	"JSMarkerReason":            "Reason for the marker: MaxAge, Purge, or Remove",
	"JSMessageIncr":             "Increment value for counter operations",
	"JSMessageCounterSources":   "Sources for counter values in JSON format",
	"JSScheduleSource":          "Source subject for scheduled message delivery",
	"JSBatchId":                 "Unique identifier for the batch",
	"JSBatchSeq":                "Sequence number within the batch",
	"JSBatchCommit":             "Marks the final message in a batch, triggering atomic commit",
	"JSSchedulePattern":         "Schedule pattern for message delivery",
	"JSScheduleTTL":             "Time-to-live for the schedule",
	"JSScheduleTarget":          "Target subject for scheduled delivery",
	"JSScheduler":               "Identifier for the scheduler",
	"JSScheduleNext":            "Next scheduled time or purge indicator",
	"JSStream":                  "Name of the stream the message came from",
	"JSSequence":                "Stream sequence number of the message",
	"JSTimeStamp":               "Timestamp when the message was stored",
	"JSSubject":                 "Original subject the message was published to",
	"JSLastSequence":            "Last sequence number in the stream when this message was delivered",
	"JSNumPending":              "Number of pending messages for the consumer",
	"JSUpToSequence":            "Upper bound sequence for batch delivery",
	"JSPullRequestPendingMsgs":  "Number of pending messages for the pull request",
	"JSPullRequestPendingBytes": "Number of pending bytes for the pull request",
	"JSPullRequestNatsPinId":    "Priority group pin identifier for the pull request",
	"JSRequiredApiLevel":        "Minimum API level required for the request",
	"MsgTraceDest":              "Destination subject for message tracing",
	"MsgTraceHop":               "Number of hops in the trace",
	"MsgTraceOriginAccount":     "Origin account for message tracing",
	"MsgTraceOnly":              "Indicates trace-only mode (message is not delivered)",
	"ClientInfoHdr":             "Client authorization information for the request",
	"AuthRequestXKeyHeader":     "Server X-Key for encrypted auth callout requests",
	"KVOperation":               "Type of KV operation: PUT, DEL, or PURGE",
}

func headerDescriptionFallback(constName string) string {
	if desc, ok := headerDescriptionData[constName]; ok {
		return desc
	}
	return ""
}

// categorizeHeaderWithSubsection determines which section and subsection a header belongs to.
func categorizeHeaderWithSubsection(name string) (section string, subsection string) {
	// Message Publishing Headers with subsections
	if strings.HasSuffix(name, "Msg-Id") {
		return "Message Publishing Headers", "Message Identification and Deduplication"
	}
	if strings.Contains(name, "Expected") {
		return "Message Publishing Headers", "Expected State Headers"
	}
	if strings.Contains(name, "Rollup") {
		return "Message Publishing Headers", "Message Rollup"
	}
	if strings.Contains(name, "Msg-Size") {
		return "Message Publishing Headers", "Message Size"
	}
	if strings.Contains(name, "TTL") && !strings.Contains(name, "Schedule") {
		return "Message Publishing Headers", "Message TTL"
	}
	if strings.Contains(name, "Incr") || strings.Contains(name, "Counter") {
		return "Message Publishing Headers", "Counter Operations"
	}
	if strings.Contains(name, "Batch") {
		return "Message Publishing Headers", "Batch Operations"
	}
	if strings.Contains(name, "Schedule") {
		return "Message Publishing Headers", "Scheduled Messages"
	}

	// Message Delivery Headers with subsections
	if (strings.Contains(name, "Stream") || strings.Contains(name, "Sequence") ||
		strings.Contains(name, "Time-Stamp") || strings.Contains(name, "Subject")) &&
		!strings.Contains(name, "Stream-Source") && !strings.Contains(name, "Consumer") &&
		!strings.Contains(name, "Pending") && !strings.Contains(name, "Stalled") {
		return "Message Delivery Headers", "Stream Information"
	}
	if strings.Contains(name, "Consumer") || strings.Contains(name, "Stalled") {
		return "Message Delivery Headers", "Consumer Information"
	}
	if strings.Contains(name, "Pending") || strings.Contains(name, "Pin-Id") || strings.Contains(name, "UpTo") {
		return "Message Delivery Headers", "Pull Request Headers"
	}
	if strings.Contains(name, "Stream-Source") {
		return "Message Delivery Headers", "Source and Mirror Information"
	}
	if strings.Contains(name, "Response-Type") {
		return "Message Delivery Headers", "Response Type"
	}

	// Top-level sections
	if strings.Contains(name, "Required-Api") {
		return "API Headers", ""
	}
	if strings.Contains(name, "Marker") {
		return "Marker Headers", ""
	}
	if strings.Contains(name, "Xkey") || strings.Contains(name, "Request-Info") {
		return "Authentication and Authorization Headers", ""
	}
	if strings.Contains(name, "Trace") {
		return "Message Tracing Headers", ""
	}
	if strings.HasPrefix(name, "KV-") {
		return "Key-Value Store Headers", ""
	}

	return "Other Headers", ""
}

func buildHeaderSections(sections map[string][]Header, sectionOrder []string) []HeaderSection {
	var result []HeaderSection
	for _, sectionName := range sectionOrder {
		sectionHeaders := make(map[string][]Header)
		var directHeaders []Header

		for key, headers := range sections {
			if strings.HasPrefix(key, sectionName) {
				if strings.Contains(key, "|") {
					parts := strings.SplitN(key, "|", 2)
					sectionHeaders[parts[1]] = headers
				} else if key == sectionName {
					directHeaders = headers
				}
			}
		}

		if len(sectionHeaders) > 0 || len(directHeaders) > 0 {
			section := HeaderSection{
				Name:        sectionName,
				Description: getSectionDescription(sectionName),
			}

			if len(sectionHeaders) > 0 {
				subsectionOrder := getSubsectionOrder(sectionName)
				for _, subsectionName := range subsectionOrder {
					if headers, ok := sectionHeaders[subsectionName]; ok {
						section.Subsections = append(section.Subsections, HeaderSubsection{
							Name:        subsectionName,
							Description: getSubsectionDescription(sectionName, subsectionName),
							Headers:     headers,
						})
						delete(sectionHeaders, subsectionName)
					}
				}
				// Collect remaining subsections in sorted order
				var remainingSubs []string
				for name := range sectionHeaders {
					remainingSubs = append(remainingSubs, name)
				}
				sort.Strings(remainingSubs)
				for _, subsectionName := range remainingSubs {
					section.Subsections = append(section.Subsections, HeaderSubsection{
						Name:    subsectionName,
						Headers: sectionHeaders[subsectionName],
					})
				}
			} else {
				section.Headers = directHeaders
			}

			result = append(result, section)
		}
	}
	return result
}

func getSubsectionOrder(sectionName string) []string {
	switch sectionName {
	case "Message Publishing Headers":
		return []string{
			"Message Identification and Deduplication",
			"Expected State Headers",
			"Message Rollup",
			"Message Size",
			"Message TTL",
			"Counter Operations",
			"Batch Operations",
			"Scheduled Messages",
		}
	case "Message Delivery Headers":
		return []string{
			"Stream Information",
			"Consumer Information",
			"Pull Request Headers",
			"Source and Mirror Information",
			"Response Type",
		}
	default:
		return []string{}
	}
}

func getSectionDescription(sectionName string) string {
	switch sectionName {
	case "Message Publishing Headers":
		return "Headers used when publishing messages to JetStream streams."
	case "Message Delivery Headers":
		return "Headers added by JetStream when delivering messages to consumers."
	case "API Headers":
		return "Headers used in JetStream API requests and responses."
	case "Marker Headers":
		return "Headers used to mark special message types in streams."
	case "Authentication and Authorization Headers":
		return "Headers used for authentication callout and authorization."
	case "Message Tracing Headers":
		return "Headers used for message tracing and diagnostics."
	case "Key-Value Store Headers":
		return "Headers used by the NATS Key-Value store built on JetStream."
	default:
		return ""
	}
}

func getSubsectionDescription(sectionName, subsectionName string) string {
	switch sectionName {
	case "Message Publishing Headers":
		switch subsectionName {
		case "Expected State Headers":
			return "These headers enforce expected state conditions when publishing. If conditions are not met, the publish will fail."
		case "Batch Operations":
			return "Headers for atomic batch publishing:"
		case "Scheduled Messages":
			return "Headers for scheduled message delivery:"
		}
	case "Message Delivery Headers":
		switch subsectionName {
		case "Pull Request Headers":
			return "Headers used in pull request responses:"
		}
	}
	return ""
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

// parseJSONTag parses a json struct tag.
// Returns (fieldName, omitEmpty, omitZero, found, exclude).
// found=false means no json tag was present (field may have other tags like yaml).
// exclude=true means json:"-" was explicitly set.
func parseJSONTag(tag string) (string, bool, bool, bool, bool) {
	tag = strings.Trim(tag, "`")
	parts := strings.Fields(tag)

	for _, part := range parts {
		if strings.HasPrefix(part, "json:") {
			jsonValue := strings.TrimPrefix(part, "json:")
			jsonValue = strings.Trim(jsonValue, `"`)

			if jsonValue == "-" {
				return "", false, false, true, true // found=true, exclude=true
			}

			segments := strings.Split(jsonValue, ",")
			fieldName := segments[0]
			omitEmpty := false
			omitZero := false
			for _, seg := range segments[1:] {
				if seg == "omitempty" {
					omitEmpty = true
				}
				if seg == "omitzero" {
					omitZero = true
				}
			}

			return fieldName, omitEmpty, omitZero, true, false // found=true, exclude=false
		}
	}

	return "", false, false, false, false // no json tag found
}

// cleanComment strips Go comment markers and extra whitespace, and joins multi-line text.
func cleanComment(s string) string {
	s = strings.TrimSpace(s)
	// Join multi-line comments into a single line
	s = strings.ReplaceAll(s, "\n", " ")
	// Collapse multiple spaces
	for strings.Contains(s, "  ") {
		s = strings.ReplaceAll(s, "  ", " ")
	}
	s = strings.TrimSpace(s)
	// Remove leading comment markers if any remain
	s = strings.TrimPrefix(s, "// ")
	return s
}

// capitalize uppercases the first rune (UTF-8 safe).
func capitalize(s string) string {
	if s == "" {
		return s
	}
	r, size := utf8.DecodeRuneInString(s)
	return string(unicode.ToUpper(r)) + s[size:]
}

// cleanDocCommentDesc strips the Go constant name prefix from doc comments.
// e.g., "ErrAuthentication represents an error condition on failed authentication."
// becomes "Error condition on failed authentication."
func cleanDocCommentDesc(constName, desc string) string {
	// Common patterns: "ErrFoo represents ...", "ErrFoo is ...", "ErrFoo signals ..."
	prefixes := []string{
		constName + " represents ",
		constName + " is ",
		constName + " signals ",
		constName + " indicates ",
		constName + " returned ",
		constName + " ",
	}
	for _, prefix := range prefixes {
		if strings.HasPrefix(desc, prefix) {
			remainder := strings.TrimPrefix(desc, prefix)
			if remainder != "" {
				return capitalize(remainder)
			}
		}
	}
	return desc
}

// -------------------------------------------------------------------
// File writing
// -------------------------------------------------------------------

func writeJSONSchema(schema JSONSchema, filename string, dryRun bool) error {
	data, err := json.MarshalIndent(schema, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal schema: %w", err)
	}

	// Append newline
	data = append(data, '\n')

	if dryRun {
		fmt.Printf("Would write to: %s\n", filename)
		fmt.Print(string(data))
		return nil
	}

	if err := os.WriteFile(filename, data, 0644); err != nil {
		return fmt.Errorf("failed to write schema %s: %w", filename, err)
	}

	fmt.Printf("Generated schema: %s\n", filename)
	return nil
}

func generateFromTemplate(tmplPath, outPath string, data interface{}, dryRun bool) error {
	tmpl, err := template.ParseFiles(tmplPath)
	if err != nil {
		return fmt.Errorf("failed to parse template %s: %w", tmplPath, err)
	}

	if dryRun {
		fmt.Printf("Would write to: %s\n", outPath)
		return tmpl.Execute(os.Stdout, data)
	}

	// Execute to buffer first to avoid partial files on error
	var buf strings.Builder
	if err := tmpl.Execute(&buf, data); err != nil {
		return fmt.Errorf("failed to execute template: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(outPath), 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	if err := os.WriteFile(outPath, []byte(buf.String()), 0644); err != nil {
		return fmt.Errorf("failed to write file %s: %w", outPath, err)
	}

	fmt.Printf("Generated: %s\n", outPath)
	return nil
}

// -------------------------------------------------------------------
// Main generation pipeline
// -------------------------------------------------------------------

// GenerateOptions bundles all path-related flags so callers don't juggle
// positional parameters as the set grows.
type GenerateOptions struct {
	ServerPath        string // path to nats-server repo (parsed)
	JsmPath           string // path to jsm.go repo (currently used only for schema copy)
	DocsOut           string // dir where generated .md files land (root of reference docs tree)
	MonitorSchemasOut string // dir where monitor JSON schemas land
	JsmSchemasOut     string // if non-empty, copy <JsmPath>/schemas/** here
	DryRun            bool
}

func generateDocs(opts GenerateOptions) error {
	// Build TypeRegistry from all monitor source files
	fmt.Println("Building type registry...")
	registry := NewTypeRegistry()
	for _, sourceFile := range monitorSourceFiles {
		path := filepath.Join(opts.ServerPath, sourceFile)
		if err := registry.ParseFile(path); err != nil {
			return fmt.Errorf("failed to parse %s: %w", sourceFile, err)
		}
	}
	fmt.Printf("  Registered %d types\n", len(registry.types))

	// Parse JetStream errors
	fmt.Println("Parsing JetStream errors...")
	jsErrors, err := parseJSErrors(opts.ServerPath)
	if err != nil {
		return err
	}

	// Parse system errors (AST-based)
	fmt.Println("Parsing system errors...")
	sysErrors, err := parseSystemErrors(opts.ServerPath)
	if err != nil {
		return err
	}

	// Merge supplemental protocol-level errors not in errors.go
	sysErrors = mergeSupplementalErrors(sysErrors)

	// Parse connection close reasons (ClosedState enum)
	fmt.Println("Parsing connection close reasons...")
	closedStates, err := parseClosedStates(opts.ServerPath)
	if err != nil {
		fmt.Printf("Warning: Could not parse ClosedState: %v\n", err)
	} else if len(closedStates) > 0 {
		var closeErrors []SystemError
		for _, cs := range closedStates {
			closeErrors = append(closeErrors, SystemError{
				Name:        cs.ConstName,
				DisplayName: cs.Description, // Human-readable from String() method
				Description: cs.Description,
			})
		}
		sysErrors = append(sysErrors, SystemErrorCategory{
			Name:   "Connection Close Reasons",
			Errors: closeErrors,
		})
	}

	// Parse headers
	fmt.Println("Parsing headers...")
	headers, err := parseHeaders(opts.ServerPath)
	if err != nil {
		return err
	}

	// Generate JetStream errors doc
	fmt.Println("Generating JetStream errors documentation...")
	if err := generateFromTemplate(
		"scripts/templates/jetstream-errors.md.tmpl",
		filepath.Join(opts.DocsOut, "jetstream/errors.md"),
		map[string]interface{}{"Categories": jsErrors},
		opts.DryRun,
	); err != nil {
		return err
	}

	// Generate system errors doc
	fmt.Println("Generating system errors documentation...")
	if err := generateFromTemplate(
		"scripts/templates/system-errors.md.tmpl",
		filepath.Join(opts.DocsOut, "system/errors.md"),
		map[string]interface{}{"Categories": sysErrors},
		opts.DryRun,
	); err != nil {
		return err
	}

	// Generate headers doc
	fmt.Println("Generating headers documentation...")
	hasBatch, hasScheduled, hasCounter := false, false, false
	check := func(h Header) {
		switch {
		case strings.HasPrefix(h.Name, "Nats-Batch"):
			hasBatch = true
		case strings.HasPrefix(h.Name, "Nats-Schedule"):
			hasScheduled = true
		case strings.HasPrefix(h.Name, "Nats-Counter"):
			hasCounter = true
		}
	}
	for _, sec := range headers {
		for _, h := range sec.Headers {
			check(h)
		}
		for _, sub := range sec.Subsections {
			for _, h := range sub.Headers {
				check(h)
			}
		}
	}
	if err := generateFromTemplate(
		"scripts/templates/headers.md.tmpl",
		filepath.Join(opts.DocsOut, "jetstream/api/headers.md"),
		map[string]interface{}{
			"Sections":     headers,
			"HasBatch":     hasBatch,
			"HasScheduled": hasScheduled,
			"HasCounter":   hasCounter,
		},
		opts.DryRun,
	); err != nil {
		return err
	}

	// Generate monitor schemas
	fmt.Println("Generating monitor endpoint schemas...")
	if err := generateMonitorSchemas(opts.MonitorSchemasOut, registry, opts.DryRun); err != nil {
		return err
	}

	// Optionally snapshot jsm.go schemas into a per-version location so that
	// MDX imports of @site/.../jsm/... resolve to this version's schemas.
	if opts.JsmSchemasOut != "" {
		if opts.JsmPath == "" {
			return fmt.Errorf("-jsm-schemas-out requires -jsm to be set")
		}
		fmt.Printf("Copying jsm.go schemas: %s -> %s\n", filepath.Join(opts.JsmPath, "schemas"), opts.JsmSchemasOut)
		if err := copyJsmSchemas(opts.JsmPath, opts.JsmSchemasOut, opts.DryRun); err != nil {
			return fmt.Errorf("failed to copy jsm.go schemas: %w", err)
		}
	}

	// --- Post-generation validation ---
	fmt.Println("\nValidating generation output...")
	var warnings []string

	totalJSErrors := 0
	for _, cat := range jsErrors {
		totalJSErrors += len(cat.Errors)
	}
	if totalJSErrors == 0 {
		warnings = append(warnings, "No JetStream errors found")
	} else {
		fmt.Printf("  JetStream errors: %d across %d categories\n", totalJSErrors, len(jsErrors))
	}

	totalSysErrors := 0
	for _, cat := range sysErrors {
		totalSysErrors += len(cat.Errors)
	}
	if totalSysErrors == 0 {
		warnings = append(warnings, "No system errors found")
	} else {
		fmt.Printf("  System errors: %d across %d categories\n", totalSysErrors, len(sysErrors))
	}

	totalHeaders := 0
	for _, sec := range headers {
		totalHeaders += len(sec.Headers)
		for _, sub := range sec.Subsections {
			totalHeaders += len(sub.Headers)
		}
	}
	if totalHeaders == 0 {
		warnings = append(warnings, "No headers found")
	} else {
		fmt.Printf("  Headers: %d across %d sections\n", totalHeaders, len(headers))
	}

	// Report unresolved types
	if len(unresolvedTypes) > 0 {
		unique := make(map[string]int)
		for _, t := range unresolvedTypes {
			unique[t]++
		}
		var sorted []string
		for t := range unique {
			sorted = append(sorted, t)
		}
		sort.Strings(sorted)
		fmt.Printf("  Unresolved types (%d unique):\n", len(sorted))
		for _, t := range sorted {
			fmt.Printf("    %s (x%d)\n", t, unique[t])
		}
		if len(sorted) > 0 {
			warnings = append(warnings, fmt.Sprintf("%d unresolved types in schemas", len(sorted)))
		}
	}

	if len(warnings) > 0 {
		fmt.Fprintf(os.Stderr, "\n--- Generation Warnings ---\n")
		for _, w := range warnings {
			fmt.Fprintf(os.Stderr, "  WARN: %s\n", w)
		}
		if strict {
			return fmt.Errorf("generation completed with %d warnings (use without -strict to allow)", len(warnings))
		}
	}

	fmt.Println("Documentation generation complete!")
	return nil
}

// copyJsmSchemas copies <jsmPath>/schemas/** into dst. Used to snapshot a
// jsm.go version's JSON schemas under a per-version vendored path so that
// generated MDX imports resolve to the correct version.
func copyJsmSchemas(jsmPath, dst string, dryRun bool) error {
	src := filepath.Join(jsmPath, "schemas")
	info, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("stat %s: %w", src, err)
	}
	if !info.IsDir() {
		return fmt.Errorf("%s is not a directory", src)
	}

	return filepath.Walk(src, func(path string, fi os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		out := filepath.Join(dst, rel)

		if fi.IsDir() {
			if dryRun {
				return nil
			}
			return os.MkdirAll(out, 0755)
		}

		// Skip non-regular files (symlinks etc).
		if !fi.Mode().IsRegular() {
			return nil
		}

		if dryRun {
			fmt.Printf("Would copy: %s -> %s\n", path, out)
			return nil
		}

		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if err := os.MkdirAll(filepath.Dir(out), 0755); err != nil {
			return err
		}
		return os.WriteFile(out, data, 0644)
	})
}

func main() {
	serverPathFlag := flag.String("server", "", "Path to nats-server repository (default: ./nats-server or ../nats-server)")
	jsmPathFlag := flag.String("jsm", "", "Path to jsm.go repository (default: ./jsm.go or ../jsm.go)")
	outputDir := flag.String("output", ".", "Legacy: base dir; prefixes defaults for -docs-out and -monitor-schemas-out")
	docsOut := flag.String("docs-out", "", "Directory to write generated reference docs (required unless -dry-run; set by scripts/generate-version.js per version)")
	monitorSchemasOut := flag.String("monitor-schemas-out", "", "Directory to write monitor JSON schemas (default: <output>/src/schemas/server/monitor/v1)")
	jsmSchemasOut := flag.String("jsm-schemas-out", "", "If set, copy <jsm>/schemas/** here (for per-version snapshots)")
	dryRun := flag.Bool("dry-run", false, "Print output to stdout instead of writing files")
	strictFlag := flag.Bool("strict", false, "Treat warnings as errors (for CI)")
	flag.Parse()

	serverPath := resolveSubmodulePath(*serverPathFlag, "nats-server")
	if serverPath == "" {
		fmt.Fprintf(os.Stderr, "Error: nats-server not found. Looked in ./nats-server and ../nats-server\n")
		fmt.Fprintf(os.Stderr, "Use -server flag to specify the correct path\n")
		os.Exit(1)
	}

	// jsm.go is only strictly required when -jsm-schemas-out is set; still
	// try to resolve it so that the path is reported consistently.
	jsmPath := resolveSubmodulePath(*jsmPathFlag, "jsm.go")
	if *jsmSchemasOut != "" && jsmPath == "" {
		fmt.Fprintf(os.Stderr, "Error: -jsm-schemas-out was set but jsm.go not found. Use -jsm to specify path\n")
		os.Exit(1)
	}

	// Require explicit -docs-out except for dry-run (which writes to stdout).
	// The legacy default (<output>/docs/reference) pointed at a path removed in
	// the per-version generator migration; generate-version.js always sets this
	// flag per version.
	if *docsOut == "" && !*dryRun {
		fmt.Fprintln(os.Stderr, "Error: -docs-out is required (use scripts/generate-version.js for per-version generation, or pass -dry-run)")
		os.Exit(1)
	}
	if *monitorSchemasOut == "" {
		*monitorSchemasOut = filepath.Join(*outputDir, "src/schemas/server/monitor/v1")
	}

	fmt.Printf("nats-server path:        %s\n", serverPath)
	if jsmPath != "" {
		fmt.Printf("jsm.go path:             %s\n", jsmPath)
	}
	fmt.Printf("Docs output:             %s\n", *docsOut)
	fmt.Printf("Monitor schemas output:  %s\n", *monitorSchemasOut)
	if *jsmSchemasOut != "" {
		fmt.Printf("jsm.go schemas output:   %s\n", *jsmSchemasOut)
	}

	strict = *strictFlag

	opts := GenerateOptions{
		ServerPath:        serverPath,
		JsmPath:           jsmPath,
		DocsOut:           *docsOut,
		MonitorSchemasOut: *monitorSchemasOut,
		JsmSchemasOut:     *jsmSchemasOut,
		DryRun:            *dryRun,
	}
	if err := generateDocs(opts); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

// resolveSubmodulePath returns the given path if set and exists, otherwise
// falls back to ./<name> or ../<name>. Returns "" when nothing found.
func resolveSubmodulePath(pathFlag, name string) string {
	if pathFlag != "" {
		if _, err := os.Stat(pathFlag); err != nil {
			if errors.Is(err, os.ErrNotExist) {
				fmt.Fprintf(os.Stderr, "Warning: %s path %s does not exist\n", name, pathFlag)
			} else {
				fmt.Fprintf(os.Stderr, "Warning: %s path %s: %v\n", name, pathFlag, err)
			}
			return ""
		}
		return pathFlag
	}
	for _, candidate := range []string{filepath.Join(".", name), filepath.Join("..", name)} {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return ""
}
