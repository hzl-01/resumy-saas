package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/ahpxex/resume-cli/services/ai/internal/config"
	"github.com/ahpxex/resume-cli/services/ai/internal/httpapi"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	server := &http.Server{
		Addr:    cfg.Address(),
		Handler: httpapi.NewHandler(cfg),
	}

	fmt.Printf("ai service listening on http://%s\n", cfg.Address())

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("listen: %v", err)
	}
}
