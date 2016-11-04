'use strict';

const BbPromise = require('bluebird'),
      _         = require('lodash');

const validate     = require('./lib/validate'),
      configure    = require('./lib/configure'),
      buildSwagger = require('./lib/buildSwagger');
// cleanup   = require('./lib/cleanup');

class SlsSwag {
  constructor(serverless, options) {
    this.serverless       = serverless;
    this.options          = options;
    this.provider         = 'aws';
    this.awsProvider      = this.serverless.getProvider('aws');
    this.globalSwagConfig = {};
    this.swagDefObj       = {};

    //Why is this not already done by framework? https://github.com/serverless/serverless/issues/2631
    this.options.stage  = this.options.stage
      || (this.serverless.service.defaults && this.serverless.service.defaults.stage)
      || 'dev';
    this.options.region = this.options.region
      || (this.serverless.service.defaults && this.serverless.service.defaults.region)
      || 'us-east-1';

    Object.assign(
      this,
      validate,
      configure,
      buildSwagger
    );

    this.commands = {
      swag: {
        usage:           'Enterprise mgmt of APIG and Lambda',
        lifecycleEvents: [
          'help',
        ],
        options:         {},
        commands:        {

          "apig-import": {
            usage:           'Import API Gateway (overwrite or merge with -p).  --region supported',
            lifecycleEvents: [
              'initialize',
              'configure',
              'buildSwagger',
              'import',
              'cleanup'
            ],
            options:         {
              regex:     {
                usage:    'Regex of resource paths to import (merge mode)',
                shortcut: 'e',
              },
              methods:   {
                usage:    'CSV of methods to import. Ex: -m PUT,GET -e "^u" Ex2: -m PUT',
                shortcut: 'm',
              },
              noConfirm: {
                usage:    'Only valid if -e  or -m specified. Don\'t confirm before importing matched paths/methods',
                shortcut: 'n',
              },
              out:       {
                usage:    'Full path to where you want the swagger.json file stored. Default is swagger.json next to serverless.yml',
                shortcut: 'o',
              },
            },
          },

          "func-deploy": {
            usage:           'Deploy HTTP evented Lambdas via AWS APIs. --stage and --region supported',
            lifecycleEvents: [
              'initialize',
              'configure',
              'package',
              'deploy',
              'cleanup'
            ],
            options:         {
              regex: {
                usage:    'Regex of functions to deploy',
                shortcut: 'e',
              },
            },
          }
        },
      },
    };

    this.hooks = {
      //Handle `sls swat apig-import`
      'swag:apig-import:initialize': () => BbPromise.bind(this)
        .then(this.validate)
        .then(this.globalConfig)
        .then(this.buildCoreSwagger)
        .then(() => {
          let q               = [];
          const functionNames = this.serverless.service.getAllFunctions();
          for (const fName of functionNames) {
            q.push(this.genSwaggerPathObj(fName)
              .then(spo => _.extend(this.swagDefObj.paths, spo)));
          }

          return BbPromise.all(q);
        })
        .then(() => {
          console.log(this.swagDefObj);
        }),
      //
      // //Handle `sls deploy function`
      // 'before:deploy:function:packageFunction': () => BbPromise.bind(this)
      //   .then(this.validate)
      //   .then(this.globalConfig)
      //   .then(() => this.bundle(this.options.function)),
      //

      //Handle `sls swag`
      'swag:help': () => BbPromise.bind(this)
        .then(() => {
          this.serverless.cli.log('Must specify a swag command. Run "serverless swag -h"');
        }),
    };
  }
}

module.exports = SlsSwag;
