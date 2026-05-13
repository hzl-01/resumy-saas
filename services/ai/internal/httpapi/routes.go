package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/ahpxex/resume-cli/services/ai/internal/config"
	"github.com/ahpxex/resume-cli/services/ai/internal/model"
)

func NewHandler(cfg config.Config) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", handleHealthz)
	mux.HandleFunc("/internal/ai/intake", func(response http.ResponseWriter, request *http.Request) {
		handleIntake(response, request, cfg)
	})
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

func handleIntake(response http.ResponseWriter, request *http.Request, cfg config.Config) {
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

	background := payload.Source.Text
	if background == "" && payload.Source.ResumeDocument != nil {
		background = model.ResumeDocumentToBackground(payload.Source.ResumeDocument)
	}

	if cfg.HasOpenAIProvider() {
		document, warnings, err := model.GenerateResumeDocument(cfg, background, payload.Context.TargetRole, payload.Context.JDText)
		if err != nil {
			writeJSON(response, http.StatusOK, ServiceResponse{
				Status: "failed",
				Error:  &ErrorPayload{Code: "provider_error", Message: err.Error()},
			})
			return
		}
		questions := model.BuildClarificationQuestions(document, model.ExtractProfileFromText(background), model.AnalyzeJD(payload.Context.JDText))
		if len(questions) > 0 {
			converted := make([]Question, 0, len(questions))
			for _, question := range questions {
				converted = append(converted, Question{Key: question.Key, Question: question.Question, Required: question.Required})
			}
			writeJSON(response, http.StatusOK, ServiceResponse{
				Status:    "needs_input",
				Questions: converted,
				Warnings:  append(warnings, "AI 还缺少关键事实，需要你补充后再继续生成。"),
			})
			return
		}

		writeJSON(response, http.StatusOK, ServiceResponse{
			Status:         "ready",
			ResumeDocument: document,
			Warnings:       warnings,
		})
		return
	}

	if background == "" {
		background = payload.Source.Text
	}
	payload.Source.Text = background
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
	extracted := model.ExtractProfileFromText(payload.Source.Text)
	title := payload.Context.TargetRole
	if title == "" {
		title = inferTitle(payload.Context.JDText)
	}
	if title == "" {
		title = extracted.Title
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

	document := map[string]any{
		"basics": map[string]any{
			"name":     fallbackString(extracted.Name, "待确认姓名"),
			"title":    title,
			"email":    optionalText(extracted.Email),
			"phone":    optionalText(extracted.Phone),
			"location": optionalText(extracted.Location),
			"summary":  chooseSummary(extracted.Summary, background),
			"links":    []any{},
		},
		"education":      mapsToAny(extracted.Education),
		"experience":     mapsToAny(extracted.Experience),
		"projects":       []any{},
		"skills":         buildSkillGroups(extracted.Skills),
		"customSections": []any{},
	}

	if len(extracted.Experience) == 0 {
		document["experience"] = []any{
			map[string]any{
				"company":      "待确认公司",
				"role":         title,
				"summary":      background,
				"highlights":   highlights,
				"technologies": []any{},
			},
		}
	}

	return ServiceResponse{
		Status:         "ready",
		ResumeDocument: document,
		Warnings:       []string{"AI sidecar 当前返回的是最小可编辑草稿，请在 editor 中继续补全姓名、公司和细节。"},
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

func fallbackString(value string, fallback string) string {
	if value != "" {
		return value
	}
	return fallback
}

func chooseSummary(extracted string, background string) string {
	if extracted != "" {
		return extracted
	}
	return background
}

func buildSkillGroups(skills []string) []any {
	if len(skills) == 0 {
		return []any{}
	}
	items := make([]any, 0, len(skills))
	for _, skill := range skills {
		items = append(items, skill)
	}
	return []any{map[string]any{"name": "技能", "items": items}}
}

func mapsToAny(items []map[string]any) []any {
	result := make([]any, 0, len(items))
	for _, item := range items {
		result = append(result, item)
	}
	return result
}

func optionalText(value string) any {
	if value == "" {
		return nil
	}
	return value
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
