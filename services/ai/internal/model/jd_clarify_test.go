package model

import "testing"

func TestAnalyzeJD(t *testing.T) {
	signals := AnalyzeJD("Senior Backend Engineer, 负责电商订单、支付、Kafka、Go、系统稳定性优化")
	if signals.Role == "" {
		t.Fatalf("expected role extracted from JD")
	}
	if len(signals.RequiredSkills) == 0 {
		t.Fatalf("expected required skills extracted from JD")
	}
	if len(signals.DomainSignals) == 0 {
		t.Fatalf("expected domain signals extracted from JD")
	}
	if len(signals.ExpectedOutcomes) == 0 {
		t.Fatalf("expected outcome signals extracted from JD")
	}
}

func TestBuildClarificationQuestions(t *testing.T) {
	document := map[string]any{
		"basics":     map[string]any{"name": "待确认姓名", "title": "待确认职位"},
		"experience": []any{map[string]any{"company": "待确认公司", "role": "待确认职位"}},
	}
	extracted := ExtractedProfile{}
	questions := BuildClarificationQuestions(document, extracted, JDSignals{})
	if len(questions) == 0 {
		t.Fatalf("expected clarification questions when critical fields are missing")
	}
}
