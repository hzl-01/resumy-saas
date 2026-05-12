package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

const (
	defaultHost = "127.0.0.1"
	defaultPort = 8081
)

type Config struct {
	Host          string
	Port          int
	OpenAIBaseURL string
	OpenAIAPIKey  string
	OpenAIModel   string
}

func Load() (Config, error) {
	host := strings.TrimSpace(os.Getenv("AI_SERVICE_HOST"))
	if host == "" {
		host = defaultHost
	}

	portValue := strings.TrimSpace(os.Getenv("AI_SERVICE_PORT"))
	baseURL := strings.TrimSpace(os.Getenv("OPENAI_BASE_URL"))
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	apiKey := strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	model := strings.TrimSpace(os.Getenv("OPENAI_MODEL"))
	if model == "" {
		model = "gpt-5.4"
	}

	if portValue == "" {
		return Config{Host: host, Port: defaultPort, OpenAIBaseURL: baseURL, OpenAIAPIKey: apiKey, OpenAIModel: model}, nil
	}

	port, err := strconv.Atoi(portValue)
	if err != nil {
		return Config{}, fmt.Errorf("AI_SERVICE_PORT must be an integer: %w", err)
	}
	if port < 1 || port > 65535 {
		return Config{}, fmt.Errorf("AI_SERVICE_PORT must be between 1 and 65535")
	}

	return Config{Host: host, Port: port, OpenAIBaseURL: baseURL, OpenAIAPIKey: apiKey, OpenAIModel: model}, nil
}

func (c Config) Address() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

func (c Config) HasOpenAIProvider() bool {
	return c.OpenAIAPIKey != "" && c.OpenAIBaseURL != "" && c.OpenAIModel != ""
}
