package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

func NewHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", handleHealthz)
	mux.HandleFunc("/internal/ai/intake", handleIntake)
	mux.HandleFunc("/internal/ai/continue", handleContinue)
	return mux
}

func handleHealthz(response http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		response.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	writeJSON(response, http.StatusOK, map[string]string{"status": "ok"})
}

func handleIntake(response http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		response.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var payload IntakeRequest
	if err := decodeJSON(request, &payload); err != nil {
		writeJSON(response, http.StatusBadRequest, map[string]string{"error": "invalid_input", "message": err.Error()})
		return
	}
	if err := validateIntake(payload); err != nil {
		writeJSON(response, http.StatusBadRequest, map[string]string{"error": "invalid_input", "message": err.Error()})
		return
	}

	writeJSON(response, http.StatusOK, buildReadyResponse(payload))
}

func handleContinue(response http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		response.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var payload ContinueRequest
	if err := decodeJSON(request, &payload); err != nil {
		writeJSON(response, http.StatusBadRequest, map[string]string{"error": "invalid_input", "message": err.Error()})
		return
	}
	if err := validateContinue(payload); err != nil {
		writeJSON(response, http.StatusBadRequest, map[string]string{"error": "invalid_input", "message": err.Error()})
		return
	}

	writeJSON(response, http.StatusOK, ServiceResponse{
		Status: "failed",
		Error: &ErrorPayload{
			Code:    "not_implemented",
			Message: "AI workflow scaffold is running but continue logic is not implemented yet",
		},
	})
}

func buildReadyResponse(payload IntakeRequest) ServiceResponse {
	title := payload.Context.TargetRole
	if title == "" {
		title = inferTitle(payload.Context.JDText)
	}
	if title == "" {
		title = "待确认职位"
	}

	background := payload.Source.Text
	if background == "" {
		background = "待补充背景材料"
	}

	highlights := buildHighlights(background)
	if len(highlights) == 0 {
		highlights = []string{"根据现有背景材料生成的初稿，待用户补充与确认。"}
	}

	return ServiceResponse{
		Status: "ready",
		ResumeDocument: map[string]any{
			"basics": map[string]any{
				"name":    "待确认姓名",
				"title":   title,
				"summary": background,
				"links":   []any{},
			},
			"education": []any{},
			"experience": []any{
				map[string]any{
					"company":      "待确认公司",
					"role":         title,
					"summary":      background,
					"highlights":   highlights,
					"technologies": []any{},
				},
			},
			"projects":       []any{},
			"skills":         []any{},
			"customSections": []any{},
		},
		Warnings: []string{"AI sidecar 当前返回的是最小可编辑草稿，请在 editor 中继续补全姓名、公司和细节。"},
	}
}

func inferTitle(jd string) string {
	if jd == "" {
		return ""
	}

	if len(jd) > 80 {
		jd = jd[:80]
	}

	for _, candidate := range []string{"Senior Backend Engineer", "Backend Engineer", "Product Engineer", "Software Engineer"} {
		if strings.Contains(strings.ToLower(jd), strings.ToLower(candidate)) {
			return candidate
		}
	}

	return ""
}

func buildHighlights(background string) []string {
	parts := splitSentences(background)
	if len(parts) > 3 {
		parts = parts[:3]
	}
	return parts
}

func splitSentences(input string) []string {
	result := []string{}
	current := ""
	for _, r := range input {
		current += string(r)
		if r == '。' || r == '.' || r == ';' || r == '；' || r == '\n' {
			trimmed := trimText(current)
			if trimmed != "" {
				result = append(result, trimmed)
			}
			current = ""
		}
	}
	trimmed := trimText(current)
	if trimmed != "" {
		result = append(result, trimmed)
	}
	return result
}

func trimText(input string) string {
	return strings.Trim(input, " \n\t.;。；")
}

func decodeJSON(request *http.Request, target any) error {
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("invalid JSON body: %w", err)
	}
	return nil
}

func validateIntake(payload IntakeRequest) error {
	if payload.JobID == "" {
		return fmt.Errorf("job_id is required")
	}

	switch payload.Source.Type {
	case "pdf", "docx", "text", "resume_id":
	default:
		return fmt.Errorf("source.type must be one of: pdf, docx, text, resume_id")
	}

	switch payload.Mode {
	case "import", "compose", "tailor":
		return nil
	default:
		return fmt.Errorf("mode must be one of: import, compose, tailor")
	}
}

func validateContinue(payload ContinueRequest) error {
	if payload.JobID == "" {
		return fmt.Errorf("job_id is required")
	}
	if payload.Answers == nil {
		return fmt.Errorf("answers is required")
	}
	for index, answer := range payload.Answers {
		if answer.Key == "" {
			return fmt.Errorf("answers[%d].key is required", index)
		}
	}
	return nil
}

func writeJSON(response http.ResponseWriter, status int, payload any) {
	response.Header().Set("Content-Type", "application/json")
	response.WriteHeader(status)
	_ = json.NewEncoder(response).Encode(payload)
}
