module.exports = function (eleventyConfig) {
  eleventyConfig.addLayoutAlias('default', 'layouts/base.njk');
  eleventyConfig.addPassthroughCopy('src/assets');
  eleventyConfig.addPassthroughCopy('static');
  // compress and combine js files
  eleventyConfig.addFilter('jsmin', require('./src/_utils/minify-js.js'));

  // minify the html output when running in prod
  if (process.env.ELEVENTY_ENV == 'production') {
    eleventyConfig.addTransform(
      'htmlmin',
      require('./src/_utils/minify-html.js')
    );
  }
  return {
    dir: {
      input: 'src',
      includes: '_includes',
      output: 'dist',
    },
    passthroughFileCopy: true,
    templateFormats: ['njk'],
    htmlTemplateEngine: 'njk',
  };
};
