package main

import (
	"fmt"
	"strconv"
	"strings"
)

// cmpVersion compares two "major.minor" server versions numerically, returning
// -1, 0 or 1. Lexicographic comparison is wrong here and the spec already
// contains a case that proves it: types/websocket.yaml carries `version: 2.2`,
// and as strings "2.2" sorts after "2.11".
//
// A trailing patch component is tolerated and ignored — the doc version axis is
// minor-only, so "2.14.3" and "2.14" compare equal.
func cmpVersion(a, b string) int {
	amaj, amin := splitVersion(a)
	bmaj, bmin := splitVersion(b)
	switch {
	case amaj != bmaj:
		if amaj < bmaj {
			return -1
		}
		return 1
	case amin != bmin:
		if amin < bmin {
			return -1
		}
		return 1
	}
	return 0
}

func splitVersion(v string) (major, minor int) {
	parts := strings.SplitN(strings.TrimSpace(v), ".", 3)
	if len(parts) > 0 {
		major, _ = strconv.Atoi(parts[0])
	}
	if len(parts) > 1 {
		minor, _ = strconv.Atoi(parts[1])
	}
	return major, minor
}

// validVersion reports whether v parses as a "major.minor" version. Anything
// else is an authoring error rather than something to silently ignore.
func validVersion(v string) bool {
	parts := strings.SplitN(strings.TrimSpace(v), ".", 3)
	if len(parts) < 2 {
		return false
	}
	for _, p := range parts[:2] {
		if p == "" {
			return false
		}
		if _, err := strconv.Atoi(p); err != nil {
			return false
		}
	}
	return true
}

// parseVersionKey splits a `versions:` map key into its version elements. A key
// may name several versions at once — "2.11, 2.12" — so an override shared by
// contiguous versions does not have to be repeated. Every element is validated
// against the known list so a typo fails the build instead of quietly matching
// nothing.
func parseVersionKey(key string, known []string) ([]string, error) {
	var out []string
	for _, raw := range strings.Split(key, ",") {
		v := strings.TrimSpace(raw)
		if v == "" {
			return nil, fmt.Errorf("empty version in key %q", key)
		}
		if !validVersion(v) {
			return nil, fmt.Errorf("malformed version %q in key %q (want major.minor, e.g. \"2.12\")", v, key)
		}
		if len(known) > 0 && !knownVersion(v, known) {
			return nil, fmt.Errorf("unknown version %q in key %q (known: %s)", v, key, strings.Join(known, ", "))
		}
		out = append(out, v)
	}
	return out, nil
}

func knownVersion(v string, known []string) bool {
	for _, k := range known {
		if cmpVersion(v, k) == 0 {
			return true
		}
	}
	return false
}

// oldestVersion returns the lowest of the known versions, used to suppress a
// "Since" badge for keys that predate everything still documented.
func oldestVersion(known []string) string {
	var oldest string
	for _, k := range known {
		if oldest == "" || cmpVersion(k, oldest) < 0 {
			oldest = k
		}
	}
	return oldest
}
