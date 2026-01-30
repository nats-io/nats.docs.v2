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
)

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

type HeaderSection struct {
	Name        string
	Description string
	Headers     []Header
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

	return categorizeJSErrors(errors), nil
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

// parseHeaders extracts header constants from stream.go
func parseHeaders(serverPath string) ([]HeaderSection, error) {
	path := filepath.Join(serverPath, streamGoPath)

	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
	if err != nil {
		return nil, fmt.Errorf("failed to parse stream.go: %w", err)
	}

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

	currentSection := ""
	sectionComments := make(map[string]string)

	// Walk the AST
	ast.Inspect(file, func(n ast.Node) bool {
		// Look for const blocks
		genDecl, ok := n.(*ast.GenDecl)
		if !ok || genDecl.Tok != token.CONST {
			return true
		}

		// Check for header-related comment
		if genDecl.Doc != nil {
			comment := genDecl.Doc.Text()
			if strings.Contains(comment, "Headers for") || strings.Contains(comment, "headers") {
				currentSection = strings.TrimSpace(strings.TrimPrefix(comment, "//"))
				currentSection = strings.TrimSuffix(currentSection, ".")
			}
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

				section := categorizeHeader(headerValue)
				sections[section] = append(sections[section], header)
			}
		}

		return true
	})

	// Build ordered result
	var result []HeaderSection
	for _, name := range sectionOrder {
		if headers, ok := sections[name]; ok {
			result = append(result, HeaderSection{
				Name:        name,
				Description: sectionComments[name],
				Headers:     headers,
			})
			delete(sections, name)
		}
	}

	// Add remaining sections
	for name, headers := range sections {
		result = append(result, HeaderSection{
			Name:    name,
			Headers: headers,
		})
	}

	return result, nil
}

// categorizeHeader determines which section a header belongs to
func categorizeHeader(name string) string {
	switch {
	case strings.Contains(name, "Expected") || strings.HasSuffix(name, "Msg-Id") ||
		strings.Contains(name, "Rollup") || strings.Contains(name, "TTL") ||
		strings.Contains(name, "Incr") || strings.Contains(name, "Counter") ||
		strings.Contains(name, "Batch") || strings.Contains(name, "Schedule"):
		return "Message Publishing Headers"
	case strings.Contains(name, "Stream") || strings.Contains(name, "Sequence") ||
		strings.Contains(name, "Consumer") || strings.Contains(name, "Pending") ||
		strings.Contains(name, "Stalled") || strings.Contains(name, "Time-Stamp") ||
		strings.Contains(name, "Pin-Id"):
		return "Message Delivery Headers"
	case strings.Contains(name, "Required-Api"):
		return "API Headers"
	case strings.Contains(name, "Marker"):
		return "Marker Headers"
	case strings.Contains(name, "Xkey") || strings.Contains(name, "Request-Info"):
		return "Authentication and Authorization Headers"
	case strings.Contains(name, "Trace"):
		return "Message Tracing Headers"
	case strings.HasPrefix(name, "KV-"):
		return "Key-Value Store Headers"
	default:
		return "Other Headers"
	}
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
