import fs from 'node:fs/promises';
import path from 'node:path';
import { workspacePaths } from './paths.mjs';
import { ensureDir } from './fsutil.mjs';
import { loadConfig } from './config.mjs';
import { ask } from './prompt.mjs';
import { llmChat } from './llm.mjs';

async function writeFile(p, content) {
  await fs.writeFile(p, content.endsWith('\n') ? content : content + '\n', 'utf8');
}

async function generateQuestions({ llm, context }) {
  const prompt = `You are OfficeWiki.
Your job: design an interview to set up an ontology for an organization, before indexing.

Constraints:
- Output MUST be valid JSON only.
- Language: Korean.
- Decision count must be between 1 and 5.
- Your interview should extract: mission-critical decisions, decision owners, evidence inputs, Data/Logic/Action mapping, governance.
- Keep it practical (engineering/ops default).

Return JSON schema:
{
  "questions": [
    {
      "id": "short_id",
      "question": "...",
      "hint": "(optional)"
    }
  ]
}

Context:
${JSON.stringify(context, null, 2)}
`;

  const raw = await llmChat({
    provider: llm.provider,
    model: llm.model,
    baseUrl: llm.baseUrl,
    messages: [
      { role: 'system', content: 'You are a careful assistant that returns strict JSON when asked.' },
      { role: 'user', content: prompt }
    ],
    maxTokens: 900
  });

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    // try to salvage by extracting first JSON block
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('LLM did not return JSON.');
    data = JSON.parse(m[0]);
  }

  if (!data.questions || !Array.isArray(data.questions)) throw new Error('Invalid questions JSON from LLM');
  return data.questions;
}

async function renderArtifacts({ llm, context, qa }) {
  const prompt = `You are OfficeWiki.
Create ontology setup artifacts for engineering/operations use.

Rules:
- Output FOUR markdown documents separated by clear delimiters exactly as:
  === Ontology.md ===
  ...
  === decisions.md ===
  ...
  === glossary.md ===
  ...
  === governance.md ===
  ...
- Use checkboxes where appropriate, e.g.:
  - [ ] 승인됨
  - [ ] 후보
- Decision count must be 1~5.
- Use the organization's original language (assume Korean unless inputs indicate otherwise).
- Practical, concrete, not salesy.

Context:
${JSON.stringify(context, null, 2)}

Q&A:
${JSON.stringify(qa, null, 2)}
`;

  const out = await llmChat({
    provider: llm.provider,
    model: llm.model,
    baseUrl: llm.baseUrl,
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: prompt }
    ],
    maxTokens: 2500
  });

  return out;
}

function splitArtifacts(text) {
  const parts = {};
  const re = /^===\s*(Ontology\.md|decisions\.md|glossary\.md|governance\.md)\s*===\s*$/gm;
  const matches = [...text.matchAll(re)];
  if (matches.length < 4) throw new Error('Could not find all 4 artifact delimiters in LLM output');

  for (let i = 0; i < matches.length; i++) {
    const name = matches[i][1];
    const start = matches[i].index + matches[i][0].length;
    const end = (i + 1 < matches.length) ? matches[i + 1].index : text.length;
    parts[name] = text.slice(start, end).trim() + '\n';
  }
  return parts;
}

export async function cmdOntologySetup({ workspace }) {
  const cfg = await loadConfig(workspace);
  if (!cfg?.llm) throw new Error('Missing LLM config. Run: officewiki setup <workspace>');

  const p = workspacePaths(workspace);
  const ontologyDir = path.join(p.root, 'ontology');
  await ensureDir(ontologyDir);

  // minimal context seeds (short to keep tokens/cost down)
  const org = await ask('조직/팀 이름', { defaultValue: '미정' });
  const mission = await ask('이 조직의 1-문장 미션(또는 KPI)', { defaultValue: '미정' });
  const failure = await ask('틀리면 비용이 폭증하는 실패/리스크는?', { defaultValue: '미정' });

  const context = {
    workspace: p.root,
    rawRoot: cfg.rawRoot,
    org,
    mission,
    failure,
    parsers: ['pptx', 'xlsx', 'docx', 'pdf', 'md', 'txt'],
    ontologyGoal: 'mission-critical decisions → Data/Logic/Action → governance'
  };

  // LLM designs the interview
  const questions = await generateQuestions({ llm: cfg.llm, context });

  const qa = [];
  for (const q of questions) {
    const ans = await ask(q.hint ? `${q.question}\n  힌트: ${q.hint}` : q.question);
    qa.push({ id: q.id, question: q.question, answer: ans });
  }

  // LLM renders artifacts
  const rendered = await renderArtifacts({ llm: cfg.llm, context, qa });
  const parts = splitArtifacts(rendered);

  await writeFile(path.join(ontologyDir, 'Ontology.md'), parts['Ontology.md']);
  await writeFile(path.join(ontologyDir, 'decisions.md'), parts['decisions.md']);
  await writeFile(path.join(ontologyDir, 'glossary.md'), parts['glossary.md']);
  await writeFile(path.join(ontologyDir, 'governance.md'), parts['governance.md']);

  console.log(JSON.stringify({
    ok: true,
    workspace: p.root,
    rawRoot: cfg.rawRoot,
    wrote: {
      ontology: 'ontology/Ontology.md',
      decisions: 'ontology/decisions.md',
      glossary: 'ontology/glossary.md',
      governance: 'ontology/governance.md'
    },
    questionCount: questions.length
  }, null, 2));
}
