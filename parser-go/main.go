package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"project-documenter/parser/parser"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("Missing project path")
	}
	projectPath, _ := filepath.Abs(os.Args[1])

	parsers := []parser.Parser{
		&parser.TypeORMParser{},
		&parser.SequelizeParser{},
		&parser.MongooseParser{},
	}

	for _, p := range parsers {
		if p.Supports(projectPath) {
			data, err := p.Parse(projectPath)
			if err != nil {
				log.Fatalf("Parsing failed: %v", err)
			}
			jsonOut, _ := json.MarshalIndent(data, "", "  ")
			fmt.Println(string(jsonOut))
			return
		}
	}

	log.Fatal("No supported parser found for the given project")
}
