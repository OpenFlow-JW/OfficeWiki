import readline from 'node:readline';

export async function runRepl({ onLine, prompt = 'officewiki> ' }) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, historySize: 1000 });
  rl.setPrompt(prompt);
  rl.prompt();

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) { rl.prompt(); continue; }
    if (trimmed === '/exit' || trimmed === '/quit') {
      rl.close();
      break;
    }
    try {
      await onLine(trimmed);
    } catch (e) {
      // keep shell alive
      console.error(String(e?.message || e));
    }
    rl.prompt();
  }
}
