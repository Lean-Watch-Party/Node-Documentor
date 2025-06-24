package parser

import (
	"os"
	"path/filepath"
	"project-documenter/parser/types"
)

type PrismaParser struct{}

func (p *PrismaParser) Supports(projectPath string) bool {
	schemaPath := filepath.Join(projectPath, "prisma", "schema.prisma")
	_, err := os.Stat(schemaPath)
	return err == nil
}

func (p *PrismaParser) Parse(projectPath string) (*types.ParsedProjectData, error) {
	// TODO: Parse prisma/schema.prisma file
	return &types.ParsedProjectData{
		Entities:      []types.ClassInfo{},
		Classes:       []types.ClassInfo{},
		Functions:     []types.APIFunctionInfo{},
		Relationships: []types.RelationshipInfo{},
	}, nil
}
