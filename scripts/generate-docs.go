package main

import (
	"encoding/json"
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
)

const (
	natsServerPath = "../nats-server"
	errorsJSONPath = "server/errors.json"
	errorsGoPath   = "server/errors.go"
	streamGoPath   = "server/stream.go"
	monitorGoPath  = "server/monitor.go"
)

// Header source files - scanned in order to find all header constants
var headerSourceFiles = []string{
	"server/stream.go",
	"server/consumer.go",
	"server/jetstream_api.go",
	"server/msgtrace.go",
	"server/accounts.go",
	"server/auth_callout.go",
}

// JetStream Error structures
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

// System Error structures
type SystemError struct {
	Name        string
	Description string
}

type SystemErrorCategory struct {
	Name   string
	Errors []SystemError
}

// Header structures
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
	Headers     []Header             // For sections without subsections
	Subsections []HeaderSubsection   // For sections with subsections (e.g., Message Publishing Headers)
}

// JSON Schema structures
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
}

// Monitor endpoint definition
type MonitorEndpoint struct {
	Name           string // e.g., "varz", "connz"
	OptionsStruct  string // e.g., "VarzOptions", "ConnzOptions"
	ResponseStruct string // e.g., "Varz", "Connz"
}

// categorizeJSErrors groups errors by their prefix
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

	// Sort errors within each category by error code
	for _, errs := range categories {
		sort.Slice(errs, func(i, j int) bool {
			return errs[i].ErrorCode < errs[j].ErrorCode
		})
	}

	// Build ordered result
	var result []ErrorCategory
	for _, name := range categoryOrder {
		fullName := name + " Errors"
		if errs, ok := categories[fullName]; ok {
			result = append(result, ErrorCategory{Name: fullName, Errors: errs})
			delete(categories, fullName)
		}
	}

	// Add any remaining categories
	for name, errs := range categories {
		result = append(result, ErrorCategory{Name: name, Errors: errs})
	}

	return result
}

// escapeMDXCurlyBraces escapes curly braces for MDX compatibility using HTML entities
func escapeMDXCurlyBraces(s string) string {
	// Replace { with &#123; (HTML entity)
	s = strings.ReplaceAll(s, "{", "&#123;")
	// Replace } with &#125; (HTML entity)
	s = strings.ReplaceAll(s, "}", "&#125;")
	return s
}

// parseJSErrors reads and parses the JetStream errors JSON
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

	// Escape curly braces in descriptions for MDX compatibility
	for i := range errors {
		errors[i].Description = escapeMDXCurlyBraces(errors[i].Description)
	}

	return categorizeJSErrors(errors), nil
}

// getManualSystemErrors returns errors that are sent as string literals in the server code
// (not defined as Go error variables, so they can't be extracted via AST parsing)
func getManualSystemErrors() []SystemErrorCategory {
	return []SystemErrorCategory{
		{
			Name: "TLS and Security Errors",
			Errors: []SystemError{
				{Name: "Secure Connection - TLS Required", Description: "Server requires TLS but client attempted non-TLS connection"},
				{Name: "TLS Handshake Error", Description: "TLS handshake failed"},
				{Name: "Certificate Not Pinned", Description: "Client certificate is not in the pinned certificates list"},
			},
		},
		{
			Name: "Route-Specific Errors",
			Errors: []SystemError{
				{Name: "Duplicate Route", Description: "Route already exists to this server"},
				{Name: "Route Authorization Violation", Description: "Route connection failed authorization"},
				{Name: "Cluster Name From Remote Server Conflicts", Description: "Remote route server has conflicting cluster name"},
				{Name: "Minimum Version Required", Description: "Route connection does not meet minimum version requirement"},
			},
		},
		{
			Name: "Slow Consumer and Flow Control",
			Errors: []SystemError{
				{Name: "Slow Consumer", Description: "Client is not consuming messages fast enough"},
				{Name: "Write Deadline Exceeded", Description: "Write operation exceeded deadline"},
			},
		},
		{
			Name: "Configuration and Resolver Errors",
			Errors: []SystemError{
				{Name: "Account Resolver Missing", Description: "Account resolver is not configured"},
				{Name: "System Account Not Configured", Description: "System account is not properly configured"},
				{Name: "Credentials Revoked", Description: "Client credentials have been revoked"},
			},
		},
	}
}

// parseSystemErrors extracts error variables from errors.go
func parseSystemErrors(serverPath string) ([]SystemErrorCategory, error) {
	path := filepath.Join(serverPath, errorsGoPath)
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read errors.go: %w", err)
	}

	content := string(data)

	// Define error categories and their patterns
	categories := []struct {
		Name    string
		Pattern *regexp.Regexp
	}{
		{"Authentication and Authorization Errors", regexp.MustCompile(`Err(Auth|Authentication|Authorization|Permissions)`)},
		{"Connection Limit Errors", regexp.MustCompile(`Err(TooMany|Maximum|Throttl)`)},
		{"Protocol and Payload Errors", regexp.MustCompile(`Err(MaxPayload|MaxControl|Protocol|Parser|Header|Responders)`)},
		{"Subject and Publishing Errors", regexp.MustCompile(`Err(BadSubject|InvalidSubject|BadPublish|InvalidPublish|Reserved|Malformed|InvalidSubscription)`)},
		{"TLS and Security Errors", regexp.MustCompile(`Err(TLS|Secure|Certificate|Proxy)`)},
		{"Account Errors", regexp.MustCompile(`Err(Account|Service|Stream.*Import|Failed.*Registration)`)},
		{"Server Name and Cluster Errors", regexp.MustCompile(`Err(Duplicate.*Server|.*Name.*Conflicts|.*Cannot.*Contain.*Spaces)`)},
		{"Wrong Port Connection Errors", regexp.MustCompile(`Err(.*Connected.*To.*Port)`)},
		{"Route-Specific Errors", regexp.MustCompile(`Err(Route|.*Route.*)`)},
		{"Gateway-Specific Errors", regexp.MustCompile(`Err(Gateway|.*Gateway.*)`)},
		{"Leafnode-Specific Errors", regexp.MustCompile(`Err(Leaf|.*Leaf.*)`)},
		{"Slow Consumer and Flow Control", regexp.MustCompile(`Err(Slow|Write.*Deadline)`)},
		{"Connection State Errors", regexp.MustCompile(`Err(Connection.*Closed|Stale|.*Not.*Running)`)},
		{"Configuration and Resolver Errors", regexp.MustCompile(`Err(Resolver|System.*Account|Credentials.*Revoked)`)},
	}

	// Extract error definitions using regex
	errorPattern := regexp.MustCompile(`(?m)^\s*Err([A-Z][a-zA-Z0-9]+)\s*=\s*errors\.New\("([^"]+)"\)`)
	matches := errorPattern.FindAllStringSubmatch(content, -1)

	errorMap := make(map[string]SystemError)
	for _, match := range matches {
		if len(match) >= 3 {
			varName := "Err" + match[1]
			description := match[2]

			// Capitalize first letter of description
			if len(description) > 0 {
				description = strings.ToUpper(description[:1]) + description[1:]
			}

			errorMap[varName] = SystemError{
				Name:        humanizeName(description),
				Description: description,
			}
		}
	}

	// Categorize errors
	result := make([]SystemErrorCategory, 0)
	used := make(map[string]bool)

	for _, cat := range categories {
		var catErrors []SystemError
		for varName, sysErr := range errorMap {
			if cat.Pattern.MatchString(varName) && !used[varName] {
				catErrors = append(catErrors, sysErr)
				used[varName] = true
			}
		}

		if len(catErrors) > 0 {
			// Sort alphabetically
			sort.Slice(catErrors, func(i, j int) bool {
				return catErrors[i].Name < catErrors[j].Name
			})
			result = append(result, SystemErrorCategory{
				Name:   cat.Name,
				Errors: catErrors,
			})
		}
	}

	// Add manual errors that are sent as string literals (not Go error variables)
	manualErrors := getManualSystemErrors()
	for _, manualCat := range manualErrors {
		// Check if category already exists
		found := false
		for i := range result {
			if result[i].Name == manualCat.Name {
				// Merge manual errors into existing category
				result[i].Errors = append(result[i].Errors, manualCat.Errors...)
				// Re-sort
				sort.Slice(result[i].Errors, func(a, b int) bool {
					return result[i].Errors[a].Name < result[i].Errors[b].Name
				})
				found = true
				break
			}
		}
		if !found {
			// Add new category
			result = append(result, manualCat)
		}
	}

	return result, nil
}

// humanizeName converts error string to human-readable name
func humanizeName(s string) string {
	// Special cases
	replacements := map[string]string{
		"authentication error":                        "Authentication Error",
		"authentication timeout":                      "Authentication Timeout",
		"authentication expired":                      "Authentication Expired",
		"maximum payload exceeded":                    "Maximum Payload Exceeded",
		"maximum control line exceeded":               "Maximum Control Line Exceeded",
		"maximum connections exceeded":                "Maximum Connections Exceeded",
		"maximum account active connections exceeded": "Maximum Account Active Connections Exceeded",
	}

	lower := strings.ToLower(s)
	if replacement, ok := replacements[lower]; ok {
		return replacement
	}

	// Capitalize first letter
	if len(s) > 0 {
		return strings.ToUpper(s[:1]) + s[1:]
	}
	return s
}

// parseHeaders extracts header constants from multiple nats-server source files
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

	// Scan all header source files
	for _, sourceFile := range headerSourceFiles {
		path := filepath.Join(serverPath, sourceFile)

		fset := token.NewFileSet()
		file, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			// Some files might not exist in older versions, skip with warning
			fmt.Printf("Warning: Could not parse %s: %v\n", sourceFile, err)
			continue
		}

		// Walk the AST
		ast.Inspect(file, func(n ast.Node) bool {
			// Look for const and var blocks
			genDecl, ok := n.(*ast.GenDecl)
			if !ok || (genDecl.Tok != token.CONST && genDecl.Tok != token.VAR) {
				return true
			}

			// Extract constants
			for _, spec := range genDecl.Specs {
				valueSpec, ok := spec.(*ast.ValueSpec)
				if !ok {
					continue
				}

				for i, name := range valueSpec.Names {
					if len(valueSpec.Values) <= i {
						continue
					}

					// Get the string value
					basicLit, ok := valueSpec.Values[i].(*ast.BasicLit)
					if !ok || basicLit.Kind != token.STRING {
						continue
					}

					headerValue := strings.Trim(basicLit.Value, `"`)
					if !strings.HasPrefix(headerValue, "Nats-") && !strings.HasPrefix(headerValue, "KV-") {
						continue
					}

					header := Header{
						Name:        headerValue,
						ValueType:   inferValueType(name.Name),
						Description: inferDescription(name.Name, headerValue),
					}

					// Categorize with subsection support
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

	// Build ordered result with subsection support
	var result []HeaderSection
	for _, sectionName := range sectionOrder {
		// Collect all headers for this section (both with and without subsections)
		sectionHeaders := make(map[string][]Header) // subsection name -> headers
		var directHeaders []Header                   // headers without subsection

		for key, headers := range sections {
			if strings.HasPrefix(key, sectionName) {
				if strings.Contains(key, "|") {
					// Has subsection
					parts := strings.SplitN(key, "|", 2)
					subsectionName := parts[1]
					sectionHeaders[subsectionName] = headers
				} else if key == sectionName {
					// No subsection
					directHeaders = headers
				}
			}
		}

		// Only add section if it has headers
		if len(sectionHeaders) > 0 || len(directHeaders) > 0 {
			section := HeaderSection{
				Name: sectionName,
			}

			if len(sectionHeaders) > 0 {
				// Build subsections
				subsectionOrder := getSubsectionOrder(sectionName)
				for _, subsectionName := range subsectionOrder {
					if headers, ok := sectionHeaders[subsectionName]; ok {
						subsection := HeaderSubsection{
							Name:        subsectionName,
							Description: getSubsectionDescription(sectionName, subsectionName),
							Headers:     headers,
						}
						section.Subsections = append(section.Subsections, subsection)
						delete(sectionHeaders, subsectionName)
					}
				}
				// Add any remaining subsections not in order
				for subsectionName, headers := range sectionHeaders {
					subsection := HeaderSubsection{
						Name:    subsectionName,
						Headers: headers,
					}
					section.Subsections = append(section.Subsections, subsection)
				}
			} else {
				// No subsections, use direct headers
				section.Headers = directHeaders
			}

			result = append(result, section)
		}
	}

	return result, nil
}

// categorizeHeader determines which section a header belongs to
func categorizeHeader(name string) string {
	section, _ := categorizeHeaderWithSubsection(name)
	return section
}

// categorizeHeaderWithSubsection determines which section and subsection a header belongs to
// Returns (section, subsection). If subsection is empty, the header goes directly in the section.
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

	// Top-level sections (no subsections)
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

// getSubsectionOrder returns the ordered list of subsections for a given section
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

// getSubsectionDescription returns the description for a subsection
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
		case "Stream Information":
			return ""
		case "Consumer Information":
			return ""
		case "Pull Request Headers":
			return "Headers used in pull request responses:"
		case "Source and Mirror Information":
			return ""
		case "Response Type":
			return ""
		}
	}
	return ""
}

// inferValueType infers the type of value for a header
func inferValueType(constName string) string {
	switch {
	case strings.Contains(constName, "Seq"):
		return "Sequence number"
	case strings.Contains(constName, "TTL"):
		return "Duration"
	case strings.Contains(constName, "Stream"):
		return "Stream name"
	case strings.Contains(constName, "Consumer"):
		return "Consumer name"
	case strings.Contains(constName, "Id"):
		return "String"
	case strings.Contains(constName, "Schedule"):
		return "Cron expression or timestamp"
	case strings.Contains(constName, "Batch"):
		return "Number or ID"
	case strings.Contains(constName, "Size"):
		return "Size in bytes"
	default:
		return "String"
	}
}

// inferDescription generates a description for a header
func inferDescription(constName, headerName string) string {
	descriptions := map[string]string{
		"JSMsgId":                   "Unique message ID for deduplication. Messages with the same ID within the deduplication window will be rejected as duplicates.",
		"JSExpectedStream":          "Verifies the message is being published to the expected stream",
		"JSExpectedLastSeq":         "Message will only be stored if the stream's last sequence matches this value",
		"JSExpectedLastSubjSeq":     "Message will only be stored if the last sequence for this subject matches this value",
		"JSExpectedLastSubjSeqSubj": "Specifies the subject for the expected last subject sequence check",
		"JSExpectedLastMsgId":       "Message will only be stored if the last message ID matches this value",
		"JSStreamSource":            "Information about the source stream in format: \"stream-name > seq > subject\"",
		"JSLastConsumerSeq":         "Consumer's last delivered sequence",
		"JSLastStreamSeq":           "Stream's last sequence at delivery time",
		"JSConsumerStalled":         "Indicates consumer is stalled with delivery count",
		"JSMsgRollup":               "Indicates this message should replace previous messages. `sub` replaces all previous messages on the same subject, `all` replaces all messages in the stream",
		"JSMsgSize":                 "Indicates the size of the message payload",
		"JSResponseType":            "Type of response being sent",
		"JSMessageTTL":              "Time-to-live for the message (e.g., \"60s\", \"5m\"). Message will be automatically removed after this duration",
		"JSMarkerReason":            "Reason for the marker: `MaxAge`, `Purge`, or `Remove`",
		"JSMessageIncr":             "Increment value for counter operations",
		"JSMessageCounterSources":   "Sources for counter values in JSON format",
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
	}

	if desc, ok := descriptions[constName]; ok {
		return desc
	}

	// Generate generic description
	return fmt.Sprintf("Header: %s", headerName)
}

// generateDocs generates documentation files from templates
// getMonitorEndpoints returns the list of monitor endpoints to generate schemas for
func getMonitorEndpoints() []MonitorEndpoint {
	return []MonitorEndpoint{
		{Name: "varz", OptionsStruct: "VarzOptions", ResponseStruct: "Varz"},
		{Name: "connz", OptionsStruct: "ConnzOptions", ResponseStruct: "Connz"},
		{Name: "routez", OptionsStruct: "RoutezOptions", ResponseStruct: "Routez"},
		{Name: "subsz", OptionsStruct: "SubszOptions", ResponseStruct: "Subsz"},
		{Name: "gatewayz", OptionsStruct: "GatewayzOptions", ResponseStruct: "Gatewayz"},
		{Name: "leafz", OptionsStruct: "LeafzOptions", ResponseStruct: "Leafz"},
		{Name: "accountz", OptionsStruct: "AccountzOptions", ResponseStruct: "Accountz"},
		{Name: "jsz", OptionsStruct: "JSzOptions", ResponseStruct: "JSInfo"},
		{Name: "healthz", OptionsStruct: "HealthzOptions", ResponseStruct: "HealthStatus"},
		{Name: "profilez", OptionsStruct: "ProfilezOptions", ResponseStruct: "ProfilezStatus"},
		{Name: "raftz", OptionsStruct: "RaftzOptions", ResponseStruct: "RaftzStatus"},
		{Name: "ipqueuesz", OptionsStruct: "IpqueueszOptions", ResponseStruct: "IpqueueszStatus"},
		// Note: statsz, accstatz, idz don't have dedicated structs - they use runtime stats
		{Name: "statsz", OptionsStruct: "", ResponseStruct: ""},
		{Name: "accstatz", OptionsStruct: "", ResponseStruct: ""},
		{Name: "idz", OptionsStruct: "", ResponseStruct: ""},
	}
}

// parseMonitorStructs parses monitor.go and extracts struct definitions and type aliases
func parseMonitorStructs(serverPath string) (map[string]*ast.StructType, map[string]ast.Expr, *ast.File, error) {
	monitorPath := filepath.Join(serverPath, monitorGoPath)

	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, monitorPath, nil, parser.ParseComments)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to parse %s: %w", monitorPath, err)
	}

	structs := make(map[string]*ast.StructType)
	typeAliases := make(map[string]ast.Expr)

	// Walk AST to find struct type declarations and type aliases
	ast.Inspect(file, func(n ast.Node) bool {
		typeSpec, ok := n.(*ast.TypeSpec)
		if !ok {
			return true
		}

		if structType, ok := typeSpec.Type.(*ast.StructType); ok {
			structs[typeSpec.Name.Name] = structType
		} else {
			// Store other type declarations (maps, aliases, etc.)
			typeAliases[typeSpec.Name.Name] = typeSpec.Type
		}
		return true
	})

	return structs, typeAliases, file, nil
}

// goTypeToJSONType converts Go types to JSON Schema types
func goTypeToJSONType(expr ast.Expr, structs map[string]*ast.StructType, file *ast.File) (string, *JSONProperty) {
	switch t := expr.(type) {
	case *ast.Ident:
		switch t.Name {
		case "string":
			return "string", nil
		case "int", "int8", "int16", "int32", "int64",
			"uint", "uint8", "uint16", "uint32", "uint64":
			return "integer", nil
		case "float32", "float64":
			return "number", nil
		case "bool":
			return "boolean", nil
		case "Time":
			return "string", &JSONProperty{Format: "date-time"}
		default:
			// Custom type - try to resolve it
			if structType, ok := structs[t.Name]; ok {
				// Convert the struct to a JSONProperty
				schema := structToJSONSchema(t.Name, structType, structs, file)
				return "object", &JSONProperty{
					Type:       "object",
					Properties: schema.Properties,
				}
			}
			// Unknown custom type - treat as object
			return "object", nil
		}
	case *ast.ArrayType:
		itemType, itemProp := goTypeToJSONType(t.Elt, structs, file)
		if itemProp == nil {
			itemProp = &JSONProperty{Type: itemType}
		}
		return "array", &JSONProperty{Items: itemProp}
	case *ast.MapType:
		return "object", &JSONProperty{Type: "object"}
	case *ast.StarExpr:
		// Pointer - unwrap and process the underlying type
		return goTypeToJSONType(t.X, structs, file)
	case *ast.SelectorExpr:
		// Package selector like time.Time
		if ident, ok := t.X.(*ast.Ident); ok && ident.Name == "time" && t.Sel.Name == "Time" {
			return "string", &JSONProperty{Format: "date-time"}
		}
		return "object", nil
	}
	return "string", nil
}

// extractJSONTag extracts the field name from json struct tag
func extractJSONTag(tag string) (string, bool) {
	if tag == "" {
		return "", false
	}

	tag = strings.Trim(tag, "`")
	parts := strings.Fields(tag)

	for _, part := range parts {
		if strings.HasPrefix(part, "json:") {
			jsonValue := strings.TrimPrefix(part, "json:")
			jsonValue = strings.Trim(jsonValue, `"`)

			// Handle json:"-" (omit field)
			if jsonValue == "-" {
				return "", false
			}

			// Handle json:"fieldname,omitempty"
			fieldName := strings.Split(jsonValue, ",")[0]
			return fieldName, true
		}
	}

	return "", false
}

// structToJSONSchema converts a Go struct to a JSON Schema
func structToJSONSchema(structName string, structType *ast.StructType, structs map[string]*ast.StructType, file *ast.File) JSONSchema {
	schema := JSONSchema{
		Schema:      "http://json-schema.org/draft-07/schema#",
		ID:          "https://nats.io/schemas/server/monitor/v1/" + strings.ToLower(structName) + ".json",
		Title:       "io.nats.server.monitor.v1." + strings.ToLower(structName),
		Description: fmt.Sprintf("NATS Server %s monitoring endpoint", structName),
		Type:        "object",
		Properties:  make(map[string]JSONProperty),
	}

	for _, field := range structType.Fields.List {
		// Get field name from JSON tag
		var fieldName string
		var include bool

		if field.Tag != nil {
			fieldName, include = extractJSONTag(field.Tag.Value)
			if !include {
				continue
			}
		}

		// If no JSON tag, use field name (lowercased)
		if fieldName == "" && len(field.Names) > 0 {
			fieldName = strings.ToLower(field.Names[0].Name)
		}

		if fieldName == "" {
			continue
		}

		// Get field type
		jsonType, prop := goTypeToJSONType(field.Type, structs, file)

		if prop == nil {
			prop = &JSONProperty{Type: jsonType}
		} else if prop.Type == "" {
			prop.Type = jsonType
		}

		// Extract description from field comment
		if field.Doc != nil && len(field.Doc.List) > 0 {
			var desc []string
			for _, comment := range field.Doc.List {
				text := strings.TrimPrefix(comment.Text, "//")
				text = strings.TrimSpace(text)
				if text != "" {
					desc = append(desc, text)
				}
			}
			if len(desc) > 0 {
				prop.Description = strings.Join(desc, " ")
			}
		}

		schema.Properties[fieldName] = *prop
	}

	return schema
}

// typeAliasToJSONSchema converts a type alias (like map types) to a JSON Schema
func typeAliasToJSONSchema(typeName string, typeExpr ast.Expr, structs map[string]*ast.StructType, file *ast.File) JSONSchema {
	schema := JSONSchema{
		Schema:      "http://json-schema.org/draft-07/schema#",
		ID:          "https://nats.io/schemas/server/monitor/v1/" + strings.ToLower(typeName) + ".json",
		Title:       "io.nats.server.monitor.v1." + strings.ToLower(typeName),
		Description: fmt.Sprintf("NATS Server %s monitoring endpoint", typeName),
	}

	// Handle map types
	if mapType, ok := typeExpr.(*ast.MapType); ok {
		schema.Type = "object"

		// Get the value type of the map
		valueType, valueProp := goTypeToJSONType(mapType.Value, structs, file)

		// Set additionalProperties to describe the map value type
		if valueProp != nil {
			schema.AdditionalProperties = valueProp
		} else {
			schema.AdditionalProperties = &JSONProperty{
				Type: valueType,
			}
		}
	} else {
		// For other type aliases, convert the underlying type
		jsonType, prop := goTypeToJSONType(typeExpr, structs, file)
		schema.Type = jsonType
		if prop != nil && prop.Properties != nil {
			schema.Properties = prop.Properties
		}
	}

	return schema
}

// generateMonitorSchemas generates JSON schemas for all monitor endpoints
func generateMonitorSchemas(serverPath, outputDir string, dryRun bool) error {
	// Parse monitor.go
	structs, typeAliases, file, err := parseMonitorStructs(serverPath)
	if err != nil {
		return err
	}

	endpoints := getMonitorEndpoints()
	schemasDir := filepath.Join(outputDir, "src/schemas/server/monitor/v1")

	if !dryRun {
		if err := os.MkdirAll(schemasDir, 0755); err != nil {
			return fmt.Errorf("failed to create schemas directory: %w", err)
		}
	}

	for _, endpoint := range endpoints {
		// Skip endpoints without struct definitions
		if endpoint.OptionsStruct == "" && endpoint.ResponseStruct == "" {
			// Generate minimal schemas for statsz, accstatz, idz
			if err := generateMinimalSchema(endpoint.Name, "request", schemasDir, dryRun); err != nil {
				return err
			}
			if err := generateMinimalSchema(endpoint.Name, "response", schemasDir, dryRun); err != nil {
				return err
			}
			continue
		}

		// Generate request schema (Options struct)
		if endpoint.OptionsStruct != "" {
			if structType, ok := structs[endpoint.OptionsStruct]; ok {
				schema := structToJSONSchema(endpoint.OptionsStruct, structType, structs, file)
				schema.Description = fmt.Sprintf("Request options for %s monitoring endpoint", endpoint.Name)

				filename := filepath.Join(schemasDir, endpoint.Name+"_request.json")
				if err := writeJSONSchema(schema, filename, dryRun); err != nil {
					return err
				}
			}
		} else {
			// No options struct - generate empty schema
			if err := generateMinimalSchema(endpoint.Name, "request", schemasDir, dryRun); err != nil {
				return err
			}
		}

		// Generate response schema
		if endpoint.ResponseStruct != "" {
			if structType, ok := structs[endpoint.ResponseStruct]; ok {
				schema := structToJSONSchema(endpoint.ResponseStruct, structType, structs, file)
				schema.Description = fmt.Sprintf("Response from %s monitoring endpoint", endpoint.Name)

				filename := filepath.Join(schemasDir, endpoint.Name+"_response.json")
				if err := writeJSONSchema(schema, filename, dryRun); err != nil {
					return err
				}
			} else if typeExpr, ok := typeAliases[endpoint.ResponseStruct]; ok {
				// Handle type aliases like map types
				schema := typeAliasToJSONSchema(endpoint.ResponseStruct, typeExpr, structs, file)
				schema.Description = fmt.Sprintf("Response from %s monitoring endpoint", endpoint.Name)

				filename := filepath.Join(schemasDir, endpoint.Name+"_response.json")
				if err := writeJSONSchema(schema, filename, dryRun); err != nil {
					return err
				}
			}
		} else {
			// No response struct - generate empty schema
			if err := generateMinimalSchema(endpoint.Name, "response", schemasDir, dryRun); err != nil {
				return err
			}
		}
	}

	return nil
}

// generateMinimalSchema creates a minimal schema for endpoints without dedicated structs
func generateMinimalSchema(endpoint, schemaType, outputDir string, dryRun bool) error {
	schema := JSONSchema{
		Schema:      "http://json-schema.org/draft-07/schema#",
		ID:          fmt.Sprintf("https://nats.io/schemas/server/monitor/v1/%s_%s.json", endpoint, schemaType),
		Title:       fmt.Sprintf("io.nats.server.monitor.v1.%s_%s", endpoint, schemaType),
		Description: fmt.Sprintf("%s for %s monitoring endpoint", strings.Title(schemaType), endpoint),
		Type:        "object",
		Properties:  make(map[string]JSONProperty),
	}

	filename := filepath.Join(outputDir, fmt.Sprintf("%s_%s.json", endpoint, schemaType))
	return writeJSONSchema(schema, filename, dryRun)
}

// writeJSONSchema writes a JSON schema to a file
func writeJSONSchema(schema JSONSchema, filename string, dryRun bool) error {
	data, err := json.MarshalIndent(schema, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal schema: %w", err)
	}

	if dryRun {
		fmt.Printf("Would write to: %s\n", filename)
		fmt.Println(string(data))
		return nil
	}

	if err := os.WriteFile(filename, data, 0644); err != nil {
		return fmt.Errorf("failed to write schema %s: %w", filename, err)
	}

	fmt.Printf("✓ Generated schema: %s\n", filename)
	return nil
}

func generateDocs(serverPath, outputDir string, dryRun bool) error {
	// Parse JetStream errors
	fmt.Println("Parsing JetStream errors...")
	jsErrors, err := parseJSErrors(serverPath)
	if err != nil {
		return err
	}

	// Parse system errors
	fmt.Println("Parsing system errors...")
	sysErrors, err := parseSystemErrors(serverPath)
	if err != nil {
		return err
	}

	// Parse headers
	fmt.Println("Parsing headers...")
	headers, err := parseHeaders(serverPath)
	if err != nil {
		return err
	}

	// Generate JetStream errors doc
	fmt.Println("Generating JetStream errors documentation...")
	if err := generateFromTemplate(
		"scripts/templates/jetstream-errors.md.tmpl",
		filepath.Join(outputDir, "docs/reference/jetstream/errors.md"),
		map[string]interface{}{"Categories": jsErrors},
		dryRun,
	); err != nil {
		return err
	}

	// Generate system errors doc
	fmt.Println("Generating system errors documentation...")
	if err := generateFromTemplate(
		"scripts/templates/system-errors.md.tmpl",
		filepath.Join(outputDir, "docs/reference/system/errors.md"),
		map[string]interface{}{"Categories": sysErrors},
		dryRun,
	); err != nil {
		return err
	}

	// Generate headers doc
	fmt.Println("Generating headers documentation...")
	if err := generateFromTemplate(
		"scripts/templates/headers.md.tmpl",
		filepath.Join(outputDir, "docs/reference/jetstream/api/headers.md"),
		map[string]interface{}{"Sections": headers},
		dryRun,
	); err != nil {
		return err
	}

	// Generate monitor schemas
	fmt.Println("Generating monitor endpoint schemas...")
	if err := generateMonitorSchemas(serverPath, outputDir, dryRun); err != nil {
		return err
	}

	fmt.Println("✓ Documentation generation complete!")
	return nil
}

// generateFromTemplate renders a template to a file
func generateFromTemplate(tmplPath, outPath string, data interface{}, dryRun bool) error {
	tmpl, err := template.ParseFiles(tmplPath)
	if err != nil {
		return fmt.Errorf("failed to parse template %s: %w", tmplPath, err)
	}

	if dryRun {
		fmt.Printf("Would write to: %s\n", outPath)
		return tmpl.Execute(os.Stdout, data)
	}

	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(outPath), 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	f, err := os.Create(outPath)
	if err != nil {
		return fmt.Errorf("failed to create file %s: %w", outPath, err)
	}
	defer f.Close()

	if err := tmpl.Execute(f, data); err != nil {
		return fmt.Errorf("failed to execute template: %w", err)
	}

	fmt.Printf("✓ Generated: %s\n", outPath)
	return nil
}

func main() {
	serverPathFlag := flag.String("server", "", "Path to nats-server repository (default: ../nats-server or ~/coding/nats-server)")
	outputDir := flag.String("output", ".", "Output directory for generated docs")
	dryRun := flag.Bool("dry-run", false, "Print output to stdout instead of writing files")
	flag.Parse()

	// Determine server path
	serverPath := *serverPathFlag
	if serverPath == "" {
		// Try relative path first
		if _, err := os.Stat(filepath.Join("..", "nats-server")); err == nil {
			serverPath = filepath.Join("..", "nats-server")
		} else {
			// Try home directory
			home, err := os.UserHomeDir()
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error: %v\n", err)
				os.Exit(1)
			}
			serverPath = filepath.Join(home, "coding", "nats-server")
		}
	}

	// Verify server path exists
	if _, err := os.Stat(serverPath); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "Error: nats-server path does not exist: %s\n", serverPath)
		fmt.Fprintf(os.Stderr, "Use -server flag to specify the correct path\n")
		os.Exit(1)
	}

	fmt.Printf("Using nats-server path: %s\n", serverPath)
	fmt.Printf("Output directory: %s\n", *outputDir)

	if err := generateDocs(serverPath, *outputDir, *dryRun); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
