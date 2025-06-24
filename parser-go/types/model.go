package types

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
