package model

import "strings"

type JDSignals struct {
	Role             string
	Seniority        string
	RequiredSkills   []string
	DomainSignals    []string
	ExpectedOutcomes []string
}

func AnalyzeJD(input string) JDSignals {
	jd := strings.TrimSpace(input)
	if jd == "" {
		return JDSignals{}
	}

	signals := JDSignals{}
	lower := strings.ToLower(jd)

	for _, role := range []string{"Senior Backend Engineer", "Backend Engineer", "Golang Engineer", "Java Engineer", "Product Engineer"} {
		if strings.Contains(lower, strings.ToLower(role)) {
			signals.Role = role
			break
		}
	}

	for _, seniority := range []string{"senior", "staff", "lead", "高级", "资深", "负责人"} {
		if strings.Contains(lower, strings.ToLower(seniority)) {
			signals.Seniority = seniority
			break
		}
	}

	for _, skill := range []string{"Go", "Java", "Kafka", "Redis", "MySQL", "Docker", "SpringBoot", "Gin", "API", "SQL"} {
		if strings.Contains(lower, strings.ToLower(skill)) {
			signals.RequiredSkills = appendUnique(signals.RequiredSkills, skill)
		}
	}

	for _, domain := range []string{"电商", "订单", "支付", "交易", "履约", "商品", "推荐", "增长", "后台"} {
		if strings.Contains(jd, domain) {
			signals.DomainSignals = appendUnique(signals.DomainSignals, domain)
		}
	}

	for _, outcome := range []string{"稳定性", "性能", "扩展性", "高并发", "可靠性", "系统优化"} {
		if strings.Contains(jd, outcome) {
			signals.ExpectedOutcomes = appendUnique(signals.ExpectedOutcomes, outcome)
		}
	}

	return signals
}

func appendUnique(items []string, item string) []string {
	for _, existing := range items {
		if existing == item {
			return items
		}
	}
	return append(items, item)
}
