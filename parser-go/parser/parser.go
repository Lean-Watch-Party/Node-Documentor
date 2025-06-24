package parser

import "project-documenter/parser/types"


type Parser interface {
	Parse(projectPath string) (*types.ParsedProjectData, error)
	Supports(projectPath string) bool
}
