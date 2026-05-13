package model

import "strings"

type ClarificationQuestion struct {
	Key      string `json:"key"`
	Question string `json:"question"`
	Required bool   `json:"required"`
}

func BuildClarificationQuestions(document map[string]any, extracted ExtractedProfile, signals JDSignals) []ClarificationQuestion {
	questions := []ClarificationQuestion{}
	basic := asMap(document["basics"])

	// Only ask for fields that would materially block a usable draft.
	if isPlaceholder(stringValue(basic["name"])) && extracted.Name == "" {
		questions = append(questions, ClarificationQuestion{Key: "candidate_name", Question: "请确认你的姓名。", Required: true})
	}

	experience := asSlice(document["experience"])
	if len(experience) == 0 && len(extracted.Experience) == 0 {
		questions = append(questions, ClarificationQuestion{Key: "core_experience", Question: "请补充最核心的一段相关工作经历（公司、职位、做了什么）。", Required: true})
	}
	_ = signals

	return questions
}

func isPlaceholder(value string) bool {
	trimmed := strings.TrimSpace(value)
	return trimmed == "" || strings.HasPrefix(trimmed, "待确认")
}
