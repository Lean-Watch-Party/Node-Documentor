package parser

import (
	"os"
	"path/filepath"
	"project-documenter/parser/types"
	"strings"
)

type SequelizeParser struct{}

func (p *SequelizeParser) Supports(projectPath string) bool {
	packageFile := filepath.Join(projectPath, "package.json")
	data, err := os.ReadFile(packageFile)
	if err != nil {
		return false
	}
	return strings.Contains(string(data), "sequelize")
}

func (p *SequelizeParser) Parse(projectPath string) (*types.ParsedProjectData, error) {
	// TODO: Implement Sequelize parsing logic
	return &types.ParsedProjectData{
		Entities:      []types.ClassInfo{},
		Classes:       []types.ClassInfo{},
		Functions:     []types.APIFunctionInfo{},
		Relationships: []types.RelationshipInfo{},
	}, nil
}
