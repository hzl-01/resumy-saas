package model

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/ahpxex/resume-cli/services/ai/internal/config"
)

type openAIRequest struct {
	Model          string          `json:"model"`
	Messages       []openAIMessage `json:"messages"`
	Temperature    float64         `json:"temperature"`
	ResponseFormat map[string]any  `json:"response_format,omitempty"`
}

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIResponse struct {
	Choices []struct {
		Message openAIMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func GenerateResumeDocument(cfg config.Config, background string, targetRole string, jdText string) (map[string]any, []string, error) {
	body, err := json.Marshal(openAIRequest{
		Model: cfg.OpenAIModel,
		Messages: []openAIMessage{
			{Role: "system", Content: systemPrompt()},
			{Role: "user", Content: userPrompt(background, targetRole, jdText)},
		},
		Temperature: 0.2,
		ResponseFormat: map[string]any{
			"type": "json_object",
		},
	})
	if err != nil {
		return nil, nil, err
	}

	request, err := http.NewRequest(http.MethodPost, strings.TrimRight(cfg.OpenAIBaseURL, "/")+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, nil, err
	}
	request.Header.Set("Authorization", "Bearer "+cfg.OpenAIAPIKey)
	request.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 45 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return nil, nil, err
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, nil, err
	}

	var parsed openAIResponse
	if err := json.Unmarshal(responseBody, &parsed); err != nil {
		return nil, nil, fmt.Errorf("decode model response: %w", err)
	}

	if response.StatusCode >= 400 {
		if parsed.Error != nil && parsed.Error.Message != "" {
			return nil, nil, fmt.Errorf("provider error: %s", parsed.Error.Message)
		}
		return nil, nil, fmt.Errorf("provider returned status %d", response.StatusCode)
	}

	if len(parsed.Choices) == 0 {
		return nil, nil, fmt.Errorf("provider returned no choices")
	}

	content := extractJSON(parsed.Choices[0].Message.Content)
	var document map[string]any
	if err := json.Unmarshal([]byte(content), &document); err != nil {
		return nil, nil, fmt.Errorf("model did not return valid JSON: %w", err)
	}

	return NormalizeResumeDocumentMap(document), []string{"由 OpenAI-compatible provider 生成，请人工复核事实准确性。"}, nil
}

func systemPrompt() string {
	return "You generate truthful resume drafts. Return only a JSON object matching the ResumeDocument shape with keys basics, education, experience, projects, skills, customSections. Do not use markdown fences. Do not invent facts. If a field is unknown, use explicit placeholders like 待确认姓名 or 待确认公司 only where required fields must be present. Keep output minimal but editable."
}

func userPrompt(background string, targetRole string, jdText string) string {
	return strings.TrimSpace(fmt.Sprintf("Candidate background:\n%s\n\nTarget role hint:\n%s\n\nJD:\n%s\n\nReturn a truthful ResumeDocument JSON draft.", background, targetRole, jdText))
}

func extractJSON(content string) string {
	trimmed := strings.TrimSpace(content)
	trimmed = strings.TrimPrefix(trimmed, "```json")
	trimmed = strings.TrimPrefix(trimmed, "```")
	trimmed = strings.TrimSuffix(trimmed, "```")
	return strings.TrimSpace(trimmed)
}
