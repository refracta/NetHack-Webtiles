let process = require('process');
module.exports.get = function (dirname) {
	// readline
	// date-utils
	var config = {};
	config.use_time_logging = true;
	config.default_prompt = '>';
	var fs = require('fs');
	var readline = require('readline');
	var date_utils = require('date-utils');
	var rl = readline.createInterface(process.stdin, process.stdout);
	init_prompt();

	function init_prompt() {
		rl.setPrompt(config.default_prompt);
		rl.prompt(true);
	}

	function logging(func, ...msgs) {
		readline.clearLine(process.stdout, 0);
		readline.cursorTo(process.stdout, 0, null);
		func.apply(console, msgs);
	}

	function get_format_time(level) {
		return '[' + new Date().toFormat('MM/DD HH24:MI:SS') + ' ' + level + ']';
	}

	function _get_logger(func) {
		return function (...msgs) {
			logging(func, ...msgs);
		}
	}

	function get_logger(func, level) {
		return function (...msgs) {
			if (config.use_time_logging) {
				msgs.unshift(get_format_time(level) + ':');
			}
			func(...msgs);
		}
	}

	if (!fs.existsSync('./' + dirname)) {
		fs.mkdirSync('./' + dirname);
	}
	
	var log = fs.createWriteStream('./' + dirname + '/log.txt', {
			flags: 'a'
		});
	var error = fs.createWriteStream('./' + dirname + '/error.txt', {
			flags: 'a'
		});
	var full = fs.createWriteStream('./' + dirname + '/full.txt', {
			flags: 'a'
		});

	var EOL = require('os').EOL;
	function __get_logger(func, stream) {
		return function (...msgs) {
			stream.write(msgs.join(' ') + EOL);
			full.write(msgs.join(' ') + EOL);
			func(...msgs);
		}
	}

	console.__log = console.log;
	console.__info = console.info;
	console.__warn = console.warn;
	console.__error = console.error;

	console.log = __get_logger(console.log, log);
	console.info = __get_logger(console.info, log);
	console.warn = __get_logger(console.warn, log);
	console.error = __get_logger(console.error, error);

	console._log = _get_logger(console.log);
	console._info = _get_logger(console.info);
	console._warn = _get_logger(console.warn);
	console._error = _get_logger(console.error);

	console.log = get_logger(console._log, 'LOG');
	console.info = get_logger(console._info, 'INFO');
	console.warn = get_logger(console._warn, 'WARN');
	console.error = get_logger(console._error, 'ERROR');

	process.on('uncaughtException', function (err) {
		console.error('UncaughtException: ' + err);
	});

	function read_input() {
		rl.question(config.default_prompt, function (read) {
			if (typeof config.listener === 'function') {
				config.listener(read);
			}
			read_input();
		});
	}

	read_input();
	var exports = {};
	exports.config = config;
	return exports;
};