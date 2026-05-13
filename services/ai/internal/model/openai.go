package model

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
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
	extracted := ExtractProfileFromText(background)
	signals := AnalyzeJD(jdText)
	body, err := json.Marshal(openAIRequest{
		Model: cfg.OpenAIModel,
		Messages: []openAIMessage{
			{Role: "system", Content: systemPrompt()},
			{Role: "user", Content: userPrompt(background, targetRole, jdText, extracted, signals)},
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

	normalized := NormalizeResumeDocumentMap(document)
	normalized = MergeExtractedProfile(normalized, extracted)
	return normalized, []string{"由 OpenAI-compatible provider 生成，请人工复核事实准确性。"}, nil
}

func systemPrompt() string {
	return strings.TrimSpace(`You are the resume-writing brain behind the resumy agent workflow.

Follow these rules strictly:
1. Candidate background comes first. The provided resume text is the primary source of truth.
2. The target JD comes second. Tailor wording and emphasis to the JD only when the background supports it.
3. Preserve truthfulness. Never invent employers, dates, metrics, degrees, tools, responsibilities, projects, or outcomes.
4. Extract as many real facts as possible from the background before falling back to placeholders.
5. Use placeholders like 待确认姓名, 待确认公司, 待确认开始时间 only when a required field is truly missing.
6. Return only a JSON object matching this exact ResumeDocument shape:
   - basics { name, title, email?, phone?, location?, website?, summary?, links[] }
   - education[] { institution, degree, startDate?, endDate?, location?, highlights[] }
   - experience[] { company, role, startDate?, endDate?, location?, summary?, highlights[], technologies[] }
   - projects[] { name, role?, url?, summary?, highlights[], technologies[] }
   - skills[] { name, items[] }
   - customSections[] { title, items[] }
7. Prefer concise, impact-oriented bullets over copying long raw paragraphs.
8. Use JD terminology only when it matches the candidate's real background.
9. Keep the strongest and most relevant experience and projects near the top.
10. Group skills for scanning instead of dumping one long list.

Do not wrap the JSON in markdown fences.`)
}

func userPrompt(background string, targetRole string, jdText string, extracted ExtractedProfile, signals JDSignals) string {
	return strings.TrimSpace(fmt.Sprintf(`Candidate background text:
%s

Target role hint:
%s

Target JD:
%s

Structured facts already extracted from the background (use these first when they are supported by the source text):
%s

JD analysis signals:
%s

Task:
- Build a truthful ResumeDocument JSON draft.
- Use the extracted facts whenever they are grounded in the source text.
- Tailor summary, ordering, bullet emphasis, and skills to the JD.
- If the JD points to backend / ecommerce / platform / payments priorities, emphasize matching real evidence from the background.
- If some required fields are genuinely missing, use explicit placeholders only for those missing fields.
	- Keep the output concise but ready for editing and PDF generation.`, background, emptyFallback(targetRole, "(none)"), emptyFallback(jdText, "(none)"), extractedSummary(extracted), jdSignalSummary(signals)))
}

func extractedSummary(extracted ExtractedProfile) string {
	lines := []string{}
	if extracted.Name != "" {
		lines = append(lines, "- name: "+extracted.Name)
	}
	if extracted.Email != "" {
		lines = append(lines, "- email: "+extracted.Email)
	}
	if extracted.Phone != "" {
		lines = append(lines, "- phone: "+extracted.Phone)
	}
	if extracted.Location != "" {
		lines = append(lines, "- location: "+extracted.Location)
	}
	if extracted.Title != "" {
		lines = append(lines, "- current/observed title: "+extracted.Title)
	}
	if extracted.Summary != "" {
		lines = append(lines, "- extracted summary: "+trimForPrompt(extracted.Summary, 240))
	}
	if len(extracted.Skills) > 0 {
		skills := append([]string{}, extracted.Skills...)
		sort.Strings(skills)
		lines = append(lines, "- extracted skills: "+strings.Join(skills, ", "))
	}
	for index, exp := range extracted.Experience {
		company := stringValue(exp["company"])
		role := stringValue(exp["role"])
		summary := stringValue(exp["summary"])
		lines = append(lines, fmt.Sprintf("- experience[%d]: company=%s | role=%s | summary=%s", index, emptyFallback(company, "(missing)"), emptyFallback(role, "(missing)"), trimForPrompt(summary, 120)))
	}
	for index, edu := range extracted.Education {
		institution := stringValue(edu["institution"])
		degree := stringValue(edu["degree"])
		lines = append(lines, fmt.Sprintf("- education[%d]: institution=%s | degree=%s", index, emptyFallback(institution, "(missing)"), emptyFallback(degree, "(missing)")))
	}
	if len(lines) == 0 {
		return "- no extracted facts available"
	}
	return strings.Join(lines, "\n")
}

func trimForPrompt(value string, max int) string {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) <= max {
		return trimmed
	}
	return trimmed[:max] + "..."
}

func emptyFallback(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func jdSignalSummary(signals JDSignals) string {
	lines := []string{}
	if signals.Role != "" {
		lines = append(lines, "- role: "+signals.Role)
	}
	if signals.Seniority != "" {
		lines = append(lines, "- seniority: "+signals.Seniority)
	}
	if len(signals.RequiredSkills) > 0 {
		lines = append(lines, "- required skills: "+strings.Join(signals.RequiredSkills, ", "))
	}
	if len(signals.DomainSignals) > 0 {
		lines = append(lines, "- domain signals: "+strings.Join(signals.DomainSignals, ", "))
	}
	if len(signals.ExpectedOutcomes) > 0 {
		lines = append(lines, "- expected outcomes: "+strings.Join(signals.ExpectedOutcomes, ", "))
	}
	if len(lines) == 0 {
		return "- no JD signals extracted"
	}
	return strings.Join(lines, "\n")
}

func extractJSON(content string) string {
	trimmed := strings.TrimSpace(content)
	trimmed = strings.TrimPrefix(trimmed, "```json")
	trimmed = strings.TrimPrefix(trimmed, "```")
	trimmed = strings.TrimSuffix(trimmed, "```")
	return strings.TrimSpace(trimmed)
}
