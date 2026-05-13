package httpapi

type IntakeRequest struct {
	JobID   string        `json:"job_id"`
	Source  IntakeSource  `json:"source"`
	Mode    string        `json:"mode"`
	Context IntakeContext `json:"context"`
}

type IntakeSource struct {
	Type           string         `json:"type"`
	FilePath       string         `json:"file_path,omitempty"`
	Text           string         `json:"text,omitempty"`
	ResumeDocument map[string]any `json:"resume_document,omitempty"`
}

type IntakeContext struct {
	JDText     string `json:"jd_text,omitempty"`
	TargetRole string `json:"target_role,omitempty"`
	UserNotes  string `json:"user_notes,omitempty"`
}

type ContinueRequest struct {
	JobID   string   `json:"job_id"`
	Answers []Answer `json:"answers"`
}

type Answer struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ServiceResponse struct {
	Status         string         `json:"status"`
	ResumeDocument map[string]any `json:"resume_document,omitempty"`
	Questions      []Question     `json:"questions,omitempty"`
	Warnings       []string       `json:"warnings,omitempty"`
	Error          *ErrorPayload  `json:"error,omitempty"`
}

type Question struct {
	Key      string `json:"key"`
	Question string `json:"question"`
	Required bool   `json:"required"`
}
