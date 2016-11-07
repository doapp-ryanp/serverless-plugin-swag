'use strict';

module.exports.validate = function() {
  if (process.env.SLS_DEBUG) {
    this.serverless.cli.log('SlsSwag::validate');
  }

  if (!this.serverless.service.custom || !this.serverless.service.custom.swag || !this.serverless.service.custom.swag.restApiId) {
    throw new this.serverless.classes.Error('Swag plugin requires custom.swag.restApiId is set in serverless.yml');
  }
};
