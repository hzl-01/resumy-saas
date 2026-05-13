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

func TestExtractProfileFromText(t *testing.T) {
	profile := ExtractProfileFromText(`黄泽林
13123123039 76550639@qq.com
2年工作经验 | 实施工程师 | 期望城市：厦门
工作经历
厦门天马微电子有限公司 mes技术员
核心系统运维支持
福州理工学院 本科 软件工程 2020-2024
专业技能
Go, Java, SQL, Linux`)

	if profile.Name != "黄泽林" {
		t.Fatalf("expected name extracted")
	}
	if profile.Phone != "13123123039" {
		t.Fatalf("expected phone extracted")
	}
	if profile.Email != "76550639@qq.com" {
		t.Fatalf("expected email extracted")
	}
	if profile.Location != "厦门" {
		t.Fatalf("expected location extracted")
	}
	if len(profile.Experience) == 0 {
		t.Fatalf("expected experience extracted")
	}
	if len(profile.Education) == 0 {
		t.Fatalf("expected education extracted")
	}
	if len(profile.Skills) == 0 {
		t.Fatalf("expected skills extracted")
	}
	if profile.Title == "" {
		t.Fatalf("expected title extracted")
	}
}
