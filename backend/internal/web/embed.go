// Package web holds the embedded production frontend build.
// In development (no dist/index.html present) the router skips the SPA handler
// and Vite serves the frontend separately on :5173.
package web

import "embed"

//go:embed all:dist
var FS embed.FS
