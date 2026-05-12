package model

import "testing"

func TestNormalizeResumeDocumentMap(t *testing.T) {
	input := map[string]any{
		"basics":     map[string]any{"label": "Backend Engineer", "name": "张三"},
		"experience": []any{map[string]any{"company": "Acme", "position": "Engineer", "keywords": []any{"Go", "Kafka"}}},
		"projects":   []any{map[string]any{"title": "Project A", "description": "Something"}},
		"skills":     []any{map[string]any{"category": "Languages", "keywords": []any{"Go"}}},
	}

	output := NormalizeResumeDocumentMap(input)
	basic := output["basics"].(map[string]any)
	if basic["title"] != "Backend Engineer" {
		t.Fatalf("expected title to map from label")
	}

	experience := output["experience"].([]any)[0].(map[string]any)
	if experience["role"] != "Engineer" {
		t.Fatalf("expected role to map from position")
	}

	project := output["projects"].([]any)[0].(map[string]any)
	if project["summary"] != "Something" {
		t.Fatalf("expected summary to map from description")
	}

	skill := output["skills"].([]any)[0].(map[string]any)
	if skill["name"] != "Languages" {
		t.Fatalf("expected skill name to map from category")
	}
}
