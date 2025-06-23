// parser-go/main.go

package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/bmatcuk/doublestar/v4"
	"github.com/evanw/esbuild/pkg/api"
)

type PropertyInfo struct {
	Name       string   `json:"name"`
	Type       string   `json:"type"`
	Decorators []string `json:"decorators"`
}

type MethodInfo struct {
	Name       string `json:"name"`
	Docs       string `json:"docs"`
	ReturnType string `json:"returnType"`
}

type ClassInfo struct {
	Name       string         `json:"name"`
	FilePath   string         `json:"filePath"`
	Docs       string         `json:"docs"`
	Methods    []MethodInfo   `json:"methods"`
	Properties []PropertyInfo `json:"properties"`
}

type RelationshipInfo struct {
	From string `json:"from"`
	To   string `json:"to"`
	Type string `json:"type"`
}

type APIFunctionInfo struct {
	Name       string `json:"name"`
	Method     string `json:"method"`
	Route      string `json:"route"`
	Docs       string `json:"docs"`
	ReturnType string `json:"returnType"`
}

type ParsedProjectData struct {
	Entities      []ClassInfo        `json:"entities"`
	Classes       []ClassInfo        `json:"classes"`
	Functions     []APIFunctionInfo  `json:"functions"`
	Relationships []RelationshipInfo `json:"relationships"`
}

var (
	classRegex    = regexp.MustCompile(`(?m)^\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)`)
	methodRegex   = regexp.MustCompile(`(?m)^\s*(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*:\s*([^{\n]+)`)
	propertyRegex = regexp.MustCompile(`(?m)^\s*(?:(@\w+\(?.*?\)?\s*)*)\s*(?:public|private|protected)?\s*(\w+)\s*:\s*([^\n;]+);`)
	routeRegex    = regexp.MustCompile(`(?m)@(?P<method>Get|Post|Put|Delete|Patch)\(['"]([^'"]+)['"]\)[\s\S]*?(\w+)\s*\(([^)]*)\)\s*:\s*([^{\n]+)`)
	relationTypes = []string{"OneToOne", "OneToMany", "ManyToOne", "ManyToMany"}
)



func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "Missing project path")
		os.Exit(1)
	}
	projectPath, _ := filepath.Abs(os.Args[1])
	files := getTSFiles(projectPath)

	final := ParsedProjectData{}

	for _, relPath := range files {
		fullPath := filepath.Join(projectPath, relPath)
		raw, _ := os.ReadFile(fullPath)

		_ = api.Transform(string(raw), api.TransformOptions{
			Loader:      api.LoaderTS,
			LogLevel:    api.LogLevelSilent,
			TsconfigRaw: `{ "compilerOptions": { "experimentalDecorators": true } }`,
		})

		content := string(raw)
		classes := classRegex.FindAllStringSubmatch(content, -1)
		apiFuncs := extractAPIFunctions(content)
		final.Functions = append(final.Functions, apiFuncs...)

		for _, match := range classes {
			className := match[1]
			props, rels := extractProperties(content, className)
			methods := extractMethods(content)

			c := ClassInfo{
				Name:       className,
				FilePath:   "/" + filepath.ToSlash(relPath),
				Docs:       "Parsed with Go regex + esbuild",
				Methods:    methods,
				Properties: props,
			}

			if strings.Contains(content, "@Entity") {
				final.Entities = append(final.Entities, c)
				final.Relationships = append(final.Relationships, rels...)
			} else {
				final.Classes = append(final.Classes, c)
			}
		}
	}

	out, _ := json.MarshalIndent(final, "", "  ")
	fmt.Println(string(out))
}

func extractAPIFunctions(text string) []APIFunctionInfo {
	matches := routeRegex.FindAllStringSubmatch(text, -1)
	var results []APIFunctionInfo

	for _, m := range matches {
		if len(m) < 6 {
			continue
		}
		method := strings.ToUpper(m[1])
		route := m[2]
		name := m[3]
		params := m[4]
		returnType := strings.TrimSpace(m[5])

		results = append(results, APIFunctionInfo{
			Name:       name,
			Method:     method,
			Route:      route,
			Docs:       fmt.Sprintf("Input: (%s)\nOutput: %s", params, returnType),
			ReturnType: returnType,
		})
	}
	return results
}

func extractMethods(text string) []MethodInfo {
	matches := methodRegex.FindAllStringSubmatch(text, -1)
	var out []MethodInfo
	for _, m := range matches {
		if len(m) < 4 {
			continue
		}
		params := m[2]
		returnType := strings.TrimSpace(m[3])
		out = append(out, MethodInfo{
			Name:       m[1],
			Docs:       fmt.Sprintf("Input: (%s)\nOutput: %s", params, returnType),
			ReturnType: returnType,
		})
	}
	return out
}

func extractProperties(text, fromClass string) ([]PropertyInfo, []RelationshipInfo) {
	lines := strings.Split(text, "\n")
	var props []PropertyInfo
	var rels []RelationshipInfo

	var buffer string
	capturing := false

	for _, line := range lines {
		line = strings.TrimSpace(line)

		if strings.HasPrefix(line, "@") || capturing {
			buffer += line + " "

			// Check if this is the end of the decorator + property line
			if strings.Contains(line, ";") {
				propMatch := propertyRegex.FindStringSubmatch(buffer)
				if len(propMatch) >= 4 {
					decoLine := propMatch[1]
					name := strings.TrimSpace(propMatch[2])
					typ := strings.TrimSpace(propMatch[3])

					var decorators []string
					parts := regexp.MustCompile(`@(\w+)`).FindAllStringSubmatch(decoLine, -1)
					for _, d := range parts {
						decorators = append(decorators, d[1])
						if isRelation(d[1]) {
							relatedClass := extractRelatedClassName(buffer)
							if relatedClass != "" {
								rels = append(rels, RelationshipInfo{
									From: fromClass,
									To:   relatedClass,
									Type: d[1],
								})
							}
						}
					}

					props = append(props, PropertyInfo{
						Name:       name,
						Type:       typ,
						Decorators: decorators,
					})
				}

				// Reset buffer
				buffer = ""
				capturing = false
			} else {
				capturing = true
			}
		}
	}

	return props, rels
}


func extractRelatedClassName(line string) string {
  // Match patterns like: @OneToMany(() => ShippingAddressEntity, ...)
  re := regexp.MustCompile(`\(\s*\(\s*\)\s*=>\s*([\w\d_]+)`)
  match := re.FindStringSubmatch(line)
  if len(match) > 1 {
    return match[1]
  }
  return ""
}



func isRelation(name string) bool {
	for _, rel := range relationTypes {
		if name == rel {
			return true
		}
	}
	return false
}

func getTSFiles(root string) []string {
	fsRoot := os.DirFS(root)
	files, err := doublestar.Glob(fsRoot, "**/*.ts")
	if err != nil {
		return nil
	}
	var list []string
	for _, f := range files {
		if strings.Contains(f, "node_modules") || strings.HasSuffix(f, ".d.ts") {
			continue
		}
		list = append(list, f)
	}
	return list
}
