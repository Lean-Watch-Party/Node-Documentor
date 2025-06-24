#!/bin/bash

# Change this if your Go main package is somewhere else
GO_SRC_DIR="./parser-go"
BINARY_NAME="go-parser"

# Platform-specific binary extension
case "$OSTYPE" in
  msys*|cygwin*|win32*)
    BINARY_NAME="${BINARY_NAME}.exe"
    ;;
esac

OUTPUT_PATH="${GO_SRC_DIR}/${BINARY_NAME}"

# Ensure directory exists
if [ ! -d "$GO_SRC_DIR" ]; then
    echo "❌ Error: Go source directory not found: $GO_SRC_DIR"
    exit 1
fi

# Remove old executable
if [ -f "$OUTPUT_PATH" ]; then
    echo "Removing old parser executable: $OUTPUT_PATH"
    rm "$OUTPUT_PATH"
fi

# Change to source directory to build
echo "Building parser binary from: $GO_SRC_DIR..."
cd "$GO_SRC_DIR" || exit 1

# Build Go binary (must have main.go with package main inside)
go build -o "$BINARY_NAME" .

# Go back to root
cd - > /dev/null

# Move binary to desired location
mv "${GO_SRC_DIR}/${BINARY_NAME}" "$OUTPUT_PATH"

# Final confirmation
if [ -f "$OUTPUT_PATH" ]; then
    echo "✅ Parser built successfully at: $OUTPUT_PATH"
else
    echo "❌ Build failed or binary not found."
    exit 1
fi
