import blessed from 'blessed';

/**
 * Simple TUI multi-select list.
 *
 * Keys:
 * - Up/Down or j/k: move
 * - Space: toggle
 * - Enter: confirm
 * - a: toggle all
 * - Esc/q: cancel
 */
export async function tuiMultiSelect({ title, items, defaultSelectedIdx = [], minPick = 1, maxPick = 5 }) {
  return await new Promise((resolve, reject) => {
    const screen = blessed.screen({ smartCSR: true, fullUnicode: true, title: 'OfficeWiki' });

    const header = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: `${title}\n(↑↓/j k 이동, Space 선택, Enter 실행, a 전체, q 취소)`,
      tags: false,
      style: { fg: 'white' }
    });

    const list = blessed.list({
      top: 3,
      left: 0,
      width: '100%',
      height: '100%-6',
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: { ch: ' ', track: { bg: 'grey' }, style: { inverse: true } },
      style: {
        selected: { bg: 'blue' },
        item: { fg: 'white' }
      }
    });

    const footer = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: '',
      style: { fg: 'white' }
    });

    const selected = new Set(defaultSelectedIdx);

    function render() {
      const lines = items.map((it, idx) => {
        const mark = selected.has(idx) ? '[x]' : '[ ]';
        return `${mark} ${it}`;
      });
      list.setItems(lines);
      const n = selected.size;
      footer.setContent(`선택: ${n}개 (min ${minPick}, max ${maxPick})`);
      screen.render();
    }

    screen.append(header);
    screen.append(list);
    screen.append(footer);

    list.focus();

    screen.key(['q', 'C-c', 'escape'], () => {
      screen.destroy();
      resolve(null);
    });

    screen.key(['space'], () => {
      const idx = list.selected;
      if (selected.has(idx)) {
        selected.delete(idx);
      } else {
        if (selected.size >= maxPick) return;
        selected.add(idx);
      }
      render();
    });

    screen.key(['a'], () => {
      if (selected.size === items.length) selected.clear();
      else {
        selected.clear();
        for (let i = 0; i < Math.min(items.length, maxPick); i++) selected.add(i);
      }
      render();
    });

    screen.key(['enter'], () => {
      const picks = Array.from(selected.values()).sort((a,b) => a-b);
      if (picks.length < minPick) return;
      screen.destroy();
      resolve(picks);
    });

    // initial selection
    for (const i of defaultSelectedIdx) {
      if (i >= 0 && i < items.length) selected.add(i);
    }
    render();
  });
}
