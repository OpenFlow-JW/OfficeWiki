# Pipeline (v0)

## 북극성
**OfficeWiki는 Code base가 아니라 Wiki base를 보는 IDE다.**

## Raw → Wiki → Ontology
1) Raw ingest
- 입력: 폴더, URL, 이미지, 문서/PDF
- 저장: `workspace/raw/` (원본 보존)

2) Parse / Normalize
- 산출: `workspace/wiki/` (Parsed/Indexed Markdown)
- 원칙: 비파괴(원본 유지), 추적성(출처 링크/해시/메타데이터)

3) Wiki layer
- 탐색: flat + metadata 중심
- drilldown: 요약 → 근거 → 원문

4) Ontology candidate extraction
- wiki를 훑어 용어/규칙/관계/워크플로우 후보를 도출
- 사람이 리뷰/승인해 `workspace/ontology/`로 승격

5) (Later) Workflows
- Ontology를 근거로 workflow/skill.md/agent.md 등을 생성·관리
- 변경 영향도(ontology↔workflow) 추적
