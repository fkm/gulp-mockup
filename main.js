'use strict';

// Node dependencies
var fs = require('fs');
var path = require('path');

// NPM dependencies
var anyEval = require('any-eval');
var gutil = require('gulp-util');
var _ = require('lodash');
var nunjucks = require('nunjucks');
var through = require('through2');

var PLUGIN_NAME = 'gulp-mockup';

var DEFAULTS = {
	templateProperty: 'template',
	// gulp plugin -> node_modules -> project root
	// REVIEW Is there a 'better' default value?
	templateDirectories: path.resolve(__dirname, '../..'),
	nunjucksOptions: {},
	nunjucksEnvironment: undefined,
};

function mapOption(options, from, to) {
	options[to] = options[from] || options[to];
	delete options[from];
}

function templateExists(environment, template) {
	var loaders = environment.loaders;
	var exists = false;

	search:
	for (var i = 0; i < loaders.length; i++) {
		var paths = loaders[i].searchPaths;

		if (!paths) {
			continue;
		}

		// https://github.com/mozilla/nunjucks/blob/master/src/node-loaders.js#L51
		for (var j = 0; j < paths.length; j++) {
			var basePath = path.resolve(paths[i]);
			var p = path.resolve(paths[i], template);

			// Only search current directory and anything underneath.
			if (p.indexOf(basePath) === 0 && fs.existsSync(p)) {
				exists = true;
				break search;
			}
		}
	}

	return exists;
}

module.exports = function njk2htmlFactory(options) {
	mapOption(options, 'tplProp', 'templateProperty');
	mapOption(options, 'tplDir',  'templateDirectories');
	mapOption(options, 'njkOpts', 'nunjucksOptions');
	mapOption(options, 'njkEnv',  'nunjucksEnvironment');
	var settings = Object.assign({}, DEFAULTS, options);

	var environment;
	if (settings.nunjucksEnvironment) {
		environment = settings.nunjucksEnvironment;
	} else {
		// https://mozilla.github.io/nunjucks/api.html#filesystemloader
		var loader = new nunjucks.FileSystemLoader(settings.templateDirectories);

		// https://mozilla.github.io/nunjucks/api.html#constructor
		environment = new nunjucks.Environment(loader, settings.nunjucksOptions);
	}

	return through.obj(function njk2htmlTransform(file, encoding, callback) {

		new Promise((resolve, reject) => {
			if (file.isNull()) {
				// https://github.com/gulpjs/gulp/blob/master/docs/API.md#optionsread

				let contents = fs.readFile(file.path, (error, data) => {
					if (error) {
						reject(error);
					} else {
						resolve(data.toString());
					}
				});

			} else if (file.isStream()) {
				// https://nodejs.org/api/stream.html

				let data = '';

				file.on('data', chunk => {
					data += chunk;
				});

				file.on('end', chunk => {
					resolve(data);
				});

				file.on('error', error => {
					reject(error);
				});

			} else if (file.isBuffer()) {
				// https://nodejs.org/api/buffer.html

				resolve(file.contents.toString());

			}
		}).then(contents => {

			// https://github.com/node-eval/any-eval#api
			var data = anyEval(contents, file.path);

			// Support for gulp-data
			// https://github.com/colynb/gulp-data#note-to-gulp-plugin-authors
			if (file.data) { _.merge(data, file.data); }

			// https://lodash.com/docs/4.17.4#at
			var template = _.at(data, settings.templateProperty)[0];

			if (template) {
				if (templateExists(environment, template)) {
					// https://mozilla.github.io/nunjucks/api.html#render
					var html = environment.render(template, data);

					// Convert markup to buffer and attach to Vinyl.
					file.contents = Buffer.from(html);

					// Files have been processed and result attached to Vinyl.
					gutil.log(
//						`[${gutil.colors.gray(PLUGIN_NAME)}]`,
						gutil.colors.green(`[DONE]`),
						file.relative,
						gutil.colors.gray(`(${template})`)
					);

					// Pass updated Vinyl to pipe.
					callback(null, file);
				} else {
					// The specified template file does not exist.
					gutil.log(
//						`[${gutil.colors.gray(PLUGIN_NAME)}]`,
						gutil.colors.red('[MISSING]'),
						file.relative
					);

					// Remove file from pipe and continue.
					callback(null, undefined);
				}
			} else {
				// No template file was specified.
				gutil.log(
//					`[${gutil.colors.gray(PLUGIN_NAME)}]`,
					gutil.colors.yellow('[UNDEFINED]'),
					file.relative
				);

				// Remove file from pipe and continue.
				callback(null, undefined);
			}

		}).catch(error => {
			callback(new gutil.PluginError({
				plugin: PLUGIN_NAME,
				showStack: true,
				showProperties: true,
				error,
			}));
		});

	});
};
