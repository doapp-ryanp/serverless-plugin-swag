'use strict';

const xtend = require('xtend');

module.exports = {
  /**
   * Compute the base configuration
   */
  globalConfig() {
    if (process.env.SLS_DEBUG) {
      this.serverless.cli.log('SlsBrowserify::globalConfig');
    }

    const globalCustom = this.serverless.service.custom.swag || {};

    let globalDefault = {  //Browserify plugin config
      globalCORS: false,
    };

    //Merge in global config
    this.globalSwagConfig = xtend(globalDefault, globalCustom);

    if (process.env.SLS_DEBUG) {
      console.log('cli options', this.options);
      console.log('computed globalSwagConfig', this.globalSwagConfig);
    }
  },
};