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
	Host string
	Port int
}

func Load() (Config, error) {
	host := strings.TrimSpace(os.Getenv("AI_SERVICE_HOST"))
	if host == "" {
		host = defaultHost
	}

	portValue := strings.TrimSpace(os.Getenv("AI_SERVICE_PORT"))
	if portValue == "" {
		return Config{Host: host, Port: defaultPort}, nil
	}

	port, err := strconv.Atoi(portValue)
	if err != nil {
		return Config{}, fmt.Errorf("AI_SERVICE_PORT must be an integer: %w", err)
	}
	if port < 1 || port > 65535 {
		return Config{}, fmt.Errorf("AI_SERVICE_PORT must be between 1 and 65535")
	}

	return Config{Host: host, Port: port}, nil
}

func (c Config) Address() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}
