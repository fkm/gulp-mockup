# gulp-mockup
Create frontend mockups from template files a backend can use so that they do not get out of sync after the go-live. Or you can just use the plugin to easily create and maintain static websites.

* [Description](#description)
* [Installation](#installation)
* [Usage](#usage)
* [Examples](#examples)
* [API](#api)
* [Related](#related)
* [License](#license)

## Description
Frontend mockups have the tendency to get out of sync with the production website after the go-live as nobody has got the time to always update the mockup with every little detail. This plugin allows the frontend developer to write template files the backend developer can use in the production code. This way, all additions to the production templates will automatically be included in the mockup.

The backend is simulated by data files which contain a path to a [Nunjucks](https://mozilla.github.io/nunjucks/) template view and the simulated data for the template context. The data files will also dictate the directory structure of the mockup and are parsed with [any-eval](https://github.com/node-eval/any-eval) to allow for code-splitting.

## Installation
Install the package with [npm](https://www.npmjs.com) and save it as a development dependency.  
`npm install --save-dev gulp-mockup`

## Usage
Create a data file for each page of your HTML mockup. The data should include a path to a Nunjucks view and some data for the rendering context.

```js
// data/projects-loremipsum.js
module.exports = {
  template: 'views/project.njk',

  title: 'Lorem Ipsum',
  lead: 'Dolor sit amet.',
  ...
};
```

Then pass a glob or an array of globs describing your data files to `gulp.src` and pipe it through this plugin - and [gulp-rename](https://github.com/hparra/gulp-rename) for the file extensions - to create a mockup with templates you can reuse in your Express backend.

The data files can have any format understood by [any-eval](https://github.com/node-eval/any-eval) and the location of the template path can be changed in the settings.

This plugins supports [gulp-data](https://github.com/colynb/gulp-data) if you want to attach more data in your Gulp task. Things you do not want to maintain by hand. For example, mock galleries from image folders.

## Examples
### Minimalistic
```js
const mockup = require('gulp-mockup');
const rename = require('gulp-rename');

gulp.task('njk', () => {
   let glob = `${__dirname}/src/njk/data/*.js`;

   let tplDir = path.join(__dirname, 'src', 'njk');

   return gulp.src(glob)
      .pipe(mockup({ tplDir }))
      .pipe(rename({ extname: '.html' }))
      .pipe(gulp.dest(path.join(__dirname, 'dist')));
});
```

### Integrated
```js
const mockup = require('gulp-mockup');
const rename = require('gulp-rename');

gulp.task('njk', () => {
   let globs = [
      // Files that should generate an output.
      `${__dirname}/app/templates/data/*.js`,

      // Helper files imported by files above.
      // This is not necessary. Files will be removed from
      // the output if they do not export a template path.
      // This is to suppress the associated warning.
      `!${__dirname}/app/templates/data/_*.js`,
   ];

   let options = {
      // Something not in use by your backend.
      tplProp: 'meta.template',
      // Where your backend stores its templates.
      tplDir: path.join(__dirname, 'app', 'templates'),
      // The environment you have set up for your backend.
      njkEnv: require(path.join(__dirname, 'app', 'nunjucks')).env,
   };

   return gulp.src(globs)
      .pipe(mockup(options))
      .pipe(rename({ extname: '.html' }))
      .pipe(gulp.dest(path.join(__dirname, 'public_html')));
});
```

## API
### mockup(options)
#### options
Type `object`

No option is required. But, you should have a look at [templateDirectories](#templatedirectories).

##### templateProperty
Type: `string`  
Default: `'template'`  
Alias: **tplProp**

Where the path to the template view is stored in the extracted data object.

The file path should be relative to [templateDirectories](#templatedirectories). Or more generally speaking, relative to the search paths of the filesystem loaders from the environment.

The plugin uses Lodash's `at` function to get to the property from a string. Check their [documentation](https://lodash.com/docs/4.17.4#at) for the string syntax.

##### templateDirectories
Type: `string` or `string[]`  
Default: `path.resolve(__dirname, '../..')`  
Alias: **tplDir**

The base directories for the paths specified in [templateProperty](#templateproperty).

The default value should point to the project root. But, you probably want to set your own value.

If you provide your own environment, this option will be ignored. Otherwise, this path will be used to initialize Nunjuck's [filesystem loader](https://mozilla.github.io/nunjucks/api.html#filesystemloader).

##### nunjucksOptions
Type: `object`  
Default: `{}`  
Alias: **njkOpts**

The options will be passed directly to the Nunjucks [Environment constructor](https://mozilla.github.io/nunjucks/api.html#constructor).

The constructor accepts the following flags:  
`autoescape`, `throwOnUndefined`, `trimBlocks`, `lstripBlocks`

For more control, you can provide your own environment to [nunjucksEnvironment](#nunjucksenvironment).

##### nunjucksEnvironment
Type: `nunjucks.Environment`  
Default: `undefined`  
Alias: **njkEnv**

The [Nunjucks environment](https://mozilla.github.io/nunjucks/api.html#environment) to be used to render the templates.

If you provide an environment, [templateDirectories](#templatedirectories) and [nunjucksOptions](#nunjucksoptions) will be ignored. Your environment should come fully configured. The idea is to pass the enviroment you use in your Express backend.

## Related
* [gulp-nunjucks](https://github.com/sindresorhus/gulp-nunjucks)  
  That is what I used before.
* [gulp-render-nunjucks](https://www.npmjs.com/package/gulp-render-nunjucks)  
  That came closest to covering my needs. But, my Gulp task felt hacky and convoluted. If my plugin is too specific for your  needs, that one will probably be what you are looking for.
* [gulp-nunjucks-render](https://github.com/carlosl/gulp-nunjucks-render)  
  That just really looked like what I needed.
* [gulp-nunjucks-md](https://www.npmjs.com/package/gulp-nunjucks-md)  
  Something similar but with front-matter.

## License
Copyright 2017 Florian Mäder - Permission granted under the [MIT License](LICENSE).
