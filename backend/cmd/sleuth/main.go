package main

import (
	"log"
	"net/http"

	"sleuth/internal/api"
)

func main() {
	router := api.NewRouter()
	log.Println("sleuth listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}
