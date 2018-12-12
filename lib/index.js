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
  if (!env) {
    throw new Error('parseEnv: You must pass in an environment object.');
  }

  debug(
    'Parsing env. CWORD: %s, COMP_POINT: %s, COMP_LINE: %s',
    env.COMP_CWORD,
    env.COMP_POINT,
    env.COMP_LINE
  );

  let cword = Number(env.COMP_CWORD);
  let point = Number(env.COMP_POINT);
  const line = env.COMP_LINE || '';

  if (Number.isNaN(cword)) cword = 0;
  if (Number.isNaN(point)) point = 0;

  const partial = line.slice(0, point);

  const parts = line.split(' ');
  const prev = parts.slice(0, -1).slice(-1)[0];

  const last = parts.slice(-1).join('');
  const lastPartial = partial
    .split(' ')
    .slice(-1)
    .join('');

  let complete = true;
  if (!env.COMP_CWORD || !env.COMP_POINT || !env.COMP_LINE) {
    complete = false;
  }

  return {
    complete,
    words: cword,
    point,
    line,
    partial,
    last,
    lastPartial,
    prev
  };
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

  if (!Array.isArray(args)) {
    throw new Error('log: Invalid arguments, must be an array');
  }

  // Normalize arguments if there are some Objects { name, description } in them.
  args = args.map(completionItem).map(item => {
    const { name, description } = item;
    let str = name;
    if (shell === 'zsh' && description) {
      str = `${name.replace(/:/g, '\\:')}:${description}`;
    } else if (shell === 'fish' && description) {
      str = `${name}\t${description}`;
    }

    return str;
  });

  if (shell === 'bash') {
    const env = parseEnv(process.env);
    args = args.filter(arg => arg.indexOf(env.last) === 0);
  }

  for (const arg of args) {
    console.log(`${arg}`);
  }
};

module.exports = {
  shell: systemShell,
  install,
  uninstall,
  parseEnv,
  log
};
