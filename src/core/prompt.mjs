import readline from 'node:readline';

export async function ask(question, { defaultValue = null } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const q = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
  const answer = await new Promise((resolve) => rl.question(q, resolve));
  rl.close();
  const v = answer.trim();
  return v || defaultValue;
}
