package parser

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"project-documenter/parser/types"
	"strings"
)

type MongooseParser struct{}

func (p *MongooseParser) Supports(projectPath string) bool {
	packageFile := filepath.Join(projectPath, "package.json")
	data, err := os.ReadFile(packageFile)
	if err != nil {
		return false
	}
	return strings.Contains(string(data), "mongoose")
}

func (p *MongooseParser) Parse(projectPath string) (*types.ParsedProjectData, error) {
	// Step 1: Get the current parser executable path
	exePath, err := os.Executable()
	if err != nil {
		return nil, fmt.Errorf("failed to resolve parser executable path: %w", err)
	}

	// Step 2: Go up one level to the root of the project
	parserDir := filepath.Dir(exePath)
	projectRoot := filepath.Join(parserDir, "..")

	// Step 3: Construct correct relative path to the script
	scriptPath := filepath.Join(projectRoot, "src", "scripts", "interface-parser.ts")

	if _, err := os.Stat(scriptPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("AST parser script not found at %s", scriptPath)
	}

	// Step 4: Run the script using ts-node
	cmd := exec.Command("npx", "ts-node", scriptPath)
	cmd.Dir = projectPath // <-- Parsed project directory remains unchanged
	cmd.Env = append(os.Environ(), "TS_NODE_TRANSPILE_ONLY=true")

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to execute interface parser: %w", err)
	}

	var parsed types.ParsedProjectData
	if err := json.Unmarshal(output, &parsed); err != nil {
		return nil, fmt.Errorf("failed to parse AST output: %w", err)
	}

	return &parsed, nil
}


