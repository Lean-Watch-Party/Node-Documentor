# 📝 NestJS Project Documentation Generator (with Bun)

This project is a **NestJS-based API** that generates a `.docx` documentation file from a given TypeScript project folder. It uses a custom Go parser, Mermaid ERD generation, and AST parsing via `ts-morph` to analyze and document your project.

---

## 🚀 Features

- Parse a given TypeScript backend project
- Extract class, function, and controller information
- Generate **Entity Relationship Diagrams (ERD)** in Mermaid format
- Recursively resolve DTOs and type definitions
- Output everything in a downloadable **.docx** format

---

## ⚙️ Requirements

- [Bun](https://bun.sh/docs/installation) installed
- [Go](https://golang.org/dl/) if using the `go-parser`
- TypeScript backend projects to generate docs from

---

## 📦 Installation

```bash
bun install
# Node-Documentor
# Node-Documentor
