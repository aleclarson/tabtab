const debug = require('./debug')('tabtab:installer')


import fs from                'fs'
import path from              'path'
import inquirer from          'inquirer';
import { spawn, exec } from   'child_process';

// Public: Manage installation / setup of completion scripts.
//
// pkg-config --variable=completionsdir bash-completion
// pkg-config --variable=compatdir bash-completion
export default class Installer {
  get home() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  }

  constructor(options, complete) {
    this.options = options || {};
    debug('init', this.options);
    this.complete = complete;
  }

  // Called on install command.
  //
  // Performs the installation process.
  handle(name) {
    debug('handle', name);
    this.options.name = name;

    return this.prompt()
      .then(this.writeTo.bind(this));
  }

  writeTo(data) {
    var destination = data.destination;
    debug('Installing completion script to %s directory', destination);

    var script = this.complete.script(this.options.name, this.options.name);

    if (destination === 'stdout') return process.stdout.write('\n\n' + script + '\n');

    if (destination === 'bashrc') destination = path.join(this.home, '.bashrc');
    else if (destination === 'zshrc') destination = path.join(this.home, '.zshrc');
    else destination = path.join(destination, this.options.name);

    return new Promise(this.createStream.bind(this, destination))
      .then(this.installCompletion.bind(this, destination))

  }

  createStream(destination, r, errback) {
    debug('Check %s destination', destination);
    var flags = 'a';
    fs.stat(destination, (err, stat) => {
      if (err && err.code === 'ENOENT') flags = 'w';
      else if (err) return errback(err);

      var out = fs.createWriteStream(destination, { flags });
      out.on('error', (err) => {
        if (err.code === 'EACCES') {
          console.error(`
Error: You don't have permission to write to ${destination}.
Try running with sudo instead:

  sudo ${process.argv.join(' ')}

`);
        }

        return errback(err);
      });

      out.on('open', () => {
        debug('Installing completion script to %s directory', destination);
        debug('Writing to %s file in %s mode', destination, flags === 'a' ? 'append' : 'write');
        r(out);
      });
    });
  }

  installCompletion(destination, out) {
    console.log( Object.keys(out) );
    var script = this.complete.script(this.options.name, this.options.name);
    var filename = path.join(__dirname, '../.completions', this.options.name);
    debug('Writing actual completion script to', filename);
    fs.writeFile(filename, script, (err) => {
      if (err) return errback(err);
      console.error('tabtab: Adding source line to load %s in %s', filename, destination);

      // fs.readFile(
      // if (new RegExp('tabtab source for ' + this.options.name, 'i').test()) {
      //
      // }

      out.write('\n');
      debug('. %s > %s', filename, destination);
      out.write('\n# tabtab source for ' + this.options.name + ' package');
      out.write('\n# uninstall by removing these lines or running `tabtab uninstall ' + this.options.name + '`');
      out.write('\n. ' + filename);
    });
  }

  // Prompts user for installation location.
  prompt() {
    var choices = [{
      name:   'Nowhere. Just output to STDOUT',
      value:  'stdout',
      short:  'stdout'
    }, {
      name:   '~/.bashrc',
      value:  'bashrc',
      short:  'bash'
    }, {
      name:   '~/.zshrc',
      value:  'zshrc',
      short:  'zsh'
    }];

    var prompts = [{
      message: 'Where do you want to setup the completion script',
      name: 'destination',
      type: 'list',
      choices: choices
    }];

    return this.completionsdir()
      .then((dir) => {
        if (dir) {
          choices.push({
            name: dir,
            value: dir,
          });
        }

        return this.compatdir();
      })
      .then((dir) => {
        if (dir) {
          choices.push({
            name: dir,
            value: dir
          });
        }

        return this.ask(prompts);
      });
  }

  ask(prompts) {
    debug('Ask', prompts);
    return inquirer.prompt(prompts);
  }

  // Public: pkg-config wrapper
  pkgconfig(variable) {
    return new Promise((r, errback) => {
      var cmd = `pkg-config --variable=${variable} bash-completion`;
      exec(cmd, function(err, stdout, stderr) {
        if (err) return errback(err);
        stdout = stdout.trim();
        debug('Got %s for %s', stdout, variable);
        r(stdout);
      });
    });
  }

  // Returns the pkg-config variable for "completionsdir" and bash-completion
  // command.
  completionsdir() {
    debug('Asking pkg-config for completionsdir');
    return this.pkgconfig('completionsdir');
  }

  // Returns the pkg-config variable for "compatdir" and bash-completion
  // command.
  compatdir() {
    debug('Asking pkg-config for compatdir');
    return this.pkgconfig('compatdir');
  }
}