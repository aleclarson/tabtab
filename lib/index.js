const split = require('split-string-words');
const prompt = require('./prompt');
const installer = require('./installer');
const { tabtabDebug, systemShell } = require('./utils');

// If TABTAB_DEBUG env is set, make it so that debug statements are also log to
// TABTAB_DEBUG file provided.
const debug = tabtabDebug('tabtab');

const install = async (options = { name: '', completer: '' }) => {
  const { name, completer } = options;
  if (!name) throw new TypeError('options.name is required');
  if (!completer) throw new TypeError('options.completer is required');

  return prompt().then(({ location }) =>
    installer.install({
      name,
      completer,
      location
    })
  );
};

const uninstall = async (options = { name: '' }) => {
  const { name } = options;
  if (!name) throw new TypeError('options.name is required');

  return installer
    .uninstall({ name })
    .catch(err => console.error('ERROR while uninstalling', err));
};

const parseEnv = env => {
  debug(
    'Parsing env. COMP_POINT: %s, COMP_LINE: %s',
    env.COMP_POINT,
    env.COMP_LINE
  );

  let cursor = Number(env.COMP_POINT);
  if (Number.isNaN(cursor)) cursor = 0;

  const input = env.COMP_LINE || '';

  // The state is an array of words.
  const state = split(input);

  let ch = 0, word = 0;
  while (word < state.length) {
    ch += state[word].length;
    if (cursor < ch) word = -1;
    if (cursor <= ch) break;
    if (cursor == ++ch && ch == input.length) {
      // When cursor is at end of input and the input ends with a space.
      word = state.length - 1;
      break;
    }
  }

  state.complete = !(env.COMP_CWORD && env.COMP_POINT && env.COMP_LINE);
  state.input = input;
  state.cursor = cursor;
  state.word = word;
  return state;
};

const completionItem = item => {
  debug('completion item', item);

  if (item.name || item.description) return item;
  const shell = systemShell();

  let name = item;
  let description = '';
  const matching = /^(.*?)(\\)?:(.*)$/.exec(item);
  if (matching) {
    [, name, , description] = matching;
  }

  if (shell === 'zsh' && /\\/.test(item)) {
    name += '\\';
  }

  return {
    name,
    description
  };
};

const log = args => {
  const shell = systemShell();
  const state = shell == 'bash' && parseEnv(process.env);
  args.forEach(arg => {
    const { name, description } = completionItem(arg);
    if (state && !name.startsWith(state[state.word])) return;
    console.log(
      description
        ? shell == 'zsh'
          ? name.replace(/:/g, '\\:') + ':' + description
        : shell == 'fish'
          ? name + '\t' + description
        : name
      : name
    );
  });
};

module.exports = {
  shell: systemShell,
  install,
  uninstall,
  parseEnv,
  log
};
