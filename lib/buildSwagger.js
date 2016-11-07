'use strict';

const BbPromise = require('bluebird'),
      os        = require('os'),
      path      = require('path'),
      fs        = BbPromise.promisifyAll(require('fs-extra')),
      _         = require('lodash');

const APP_JSON_CONTENT_TYPE   = 'application/json; charset=utf-8',
      SWAG_200_RESPONSE       = {
        "description": "200 response",
        "schema":      {
          "$ref": "#/definitions/Empty"
        }
      },
      apigLambdaProxyTemplate = {
        "produces":                        [
          "application/json"
        ],
        "responses":                       {
          "200": SWAG_200_RESPONSE,
        },
        "x-amazon-apigateway-integration": {
          "uri":                 "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:527930388204:function:echo/invocations",
          "passthroughBehavior": "when_no_match",
          "httpMethod":          "POST",
          "responses":           {
            "default": {
              "statusCode": "200"
            }
          },
          "type":                "aws_proxy"
        }
      };

module.exports = {
  buildCoreSwagger() {
    const tmpSwagFilePath   = path.join(os.tmpdir(), +new Date() + '.json'),
          finalSwagFilePath = this.options.out || path.join(this.serverless.config.servicePath, 'swagger.json'),
          now               = new Date();

    if (process.env.SLS_DEBUG) {
      this.serverless.cli.log(`Building swagger file at ${tmpSwagFilePath}. Final destination ${finalSwagFilePath}`);
    }

    this.swagDefObj = {
      "swagger":     "2.0",
      "info":        {
        "version": now.toISOString(),
        "title":   this.serverless.service.service
      },
      "host":        "",
      "basePath":    "",
      "schemes":     [
        "https"
      ],
      "paths":       {},
      "definitions": {
        "Empty": {
          "type":  "object",
          "title": "Empty Schema"
        }
      },
    };

    if (this.globalSwagConfig.globalCORS) {
      this.swagDefObj.paths['/{proxy+}'] = generateGlobalCORS(this.globalSwagConfig);
    }
  },

  genSwaggerPathObj(functionName){
    const importOnlyTheseMethods = (this.options.methods && !!this.options.methods.trim()) ? this.options.methods.trim.split(',').map(m=>m.trim()) : [],
          functionObject         = this.serverless.service.getFunction(functionName),
          funcNameAndAlias       = ('dev' != this.options.stage) ? `${functionObject.name}:${this.options.stage}` : functionObject.name;

    //If function does not have any swagHttp events return
    if (!functionObject.events.some(e => 'swagHttp' in e)) {
      return {};
    }

    return checkIfLambdaExists(this.awsProvider, funcNameAndAlias, this.options.stage, this.options.region)
      .then(lambdaArn => {
        if (process.env.SLS_DEBUG) {
          this.serverless.cli.log(`Building swagger path objs for ${functionName}`);
        }

        let pathsToReturn = {};
        const awsAcctId   = lambdaArn.split(':')[4],
            uri           = `arn:aws:apigateway:${this.options.region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${this.options.region}:${awsAcctId}:function:${funcNameAndAlias}/invocations`,
            template      = {
              "responses":                       {
                "200": {
                  "description": "200 response",
                  "headers":     {
                    "Access-Control-Allow-Origin": {
                      "type": "string"
                    }
                  }
                }
              },
              "x-amazon-apigateway-integration": {
                "httpMethod":          "",  //POST,GET etc
                "uri":                 "",
                "passthroughBehavior": "never",
                "responses":           {
                  "default": {
                    "statusCode": "200",
                    // "responseParameters": (this.globalSwagConfig.globalCORS) ? {"method.response.header.Access-Control-Allow-Origin": "'" + this.globalSwagConfig.globalCORS.allowOrigins + "'"} : {},
                  }
                },
                "type":                "aws_proxy"
              }
            };

        functionObject.events.filter(e => 'swagHttp' in e).map(e => e.swagHttp).forEach(swagEvent => {
          //Filter out methods user didn't want to import (if specified)
          if (importOnlyTheseMethods.length && -1 != importOnlyTheseMethods.indexOf(swagEvent.method)) {
            return;
          }

          const path            = (0 !== swagEvent.path.indexOf('/')) ? `/${swagEvent.path}` : swagEvent.path,
                apigIntegration = {
                  "uri":        uri,
                  "httpMethod": swagEvent.method.toUpperCase(),
                };

          if (!(path in pathsToReturn)) {
            pathsToReturn[path] = {};
          }

          pathsToReturn[path][swagEvent.method.toLowerCase()] = _.extend({}, template, {
            "x-amazon-apigateway-integration": apigIntegration
          });

          if (process.env.SLS_DEBUG) {
            console.log('Computed APIG integration', apigIntegration);
          }
        });

        console.log(pathsToReturn);

        return pathsToReturn;
      });
  },

  // buildPath() {
  //   let functionObject           = this.serverless.service.getFunction(functionName);
  //   const tmpSwagFile            = path.join(os.tmpdir(), +new Date() + '.json'),
  //       finalSwagFile            = this.options.out || path.join(this.serverless.config.servicePath, 'swagger.json'),
  //       functionBrowserifyConfig = this.getFunctionConfig(functionName),
  //       finalZipFilePath         = path.resolve(path.join(outputDir, '..', `${functionName}.zip`));
  //
  //   let b = browserify(functionBrowserifyConfig);
  //
  //   this.serverless.cli.log(`Bundling ${functionName} with Browserify...`);
  //
  //   if (process.env.SLS_DEBUG) {
  //     this.serverless.cli.log(`Writing browserfied bundle to ${outputDir}`);
  //   }
  //
  //   fs.emptyDirSync(outputDir);
  //
  //   functionBrowserifyConfig.exclude.forEach(file => b.exclude(file));
  //   functionBrowserifyConfig.ignore.forEach(file => b.ignore(file));
  //
  //   return new BbPromise((resolve, reject) => {
  //     b.bundle((err, bundledBuf) => {
  //       if (err) {
  //         return reject(err);
  //       }
  //
  //       const handlerPath = path.join(outputDir, functionObject.handler.split('.')[0] + '.js');
  //
  //       fs.mkdirSync(path.dirname(handlerPath), '0777');  //handler may be in a subdir
  //       fs.writeFile(handlerPath, bundledBuf, (err)=> {
  //         (err) ? reject(err) : resolve();
  //       });
  //     });
  //   })
  //     .then(()=> {
  //       if (process.env.SLS_DEBUG) {
  //         this.serverless.cli.log(`Zipping ${outputDir} to ${finalZipFilePath}`);
  //       }
  //
  //       return zipDir(outputDir, finalZipFilePath);
  //     })
  //     .then((sizeBytes)=> {
  //       const fileSizeInMegabytes = sizeBytes / 1000000.0;
  //       this.serverless.cli.log(`Created ${functionName}.zip (${Math.round(fileSizeInMegabytes * 100) / 100} MB)...`);
  //
  //       if (!functionObject.package) {
  //         functionObject.package = {};
  //       }
  //
  //       //This is how we tell Serverless to not do any bunding or zipping
  //       //@see https://serverless.com/framework/docs/providers/aws/guide/packaging/#artifact
  //       functionObject.package.artifact = finalZipFilePath;
  //     });
  // },
};

function generateGlobalCORS(swagConfig) {
  ['allowOrigins', 'allowHeaders', 'allowMethods'].forEach(reqAttr => {
    if (!swagConfig.globalCORS[reqAttr]) {
      throw new this.serverless.classes.Error('allowOrigins, allowHeaders, allowMethods must be specified for swag.globalCORS');
    }
  });

  return {
    "options":                         {
      "consumes": [
        APP_JSON_CONTENT_TYPE
      ],

      "produces": [
        APP_JSON_CONTENT_TYPE
      ],

      "responses": {
        "200":     SWAG_200_RESPONSE,
        "headers": {
          "Access-Control-Allow-Origin":  {
            "type": "string"
          },
          "Access-Control-Allow-Methods": {
            "type": "string"
          },
          "Access-Control-Allow-Headers": {
            "type": "string"
          }
        }
      }

    },
    "x-amazon-apigateway-integration": {
      "passthroughBehavior": "when_no_match",

      "requestTemplates": {
        "application/json": "{\"statusCode\": 200}"
      },

      "responses": {
        "default": {
          "statusCode":         "200",
          "responseParameters": {
            "method.response.header.Access-Control-Allow-Methods": "'" + swagConfig.globalCORS.allowMethods + "'",
            "method.response.header.Access-Control-Allow-Headers": "'" + swagConfig.globalCORS.allowHeaders + "'",
            "method.response.header.Access-Control-Allow-Origin":  "'" + swagConfig.globalCORS.allowOrigins + "'"
          }
        }
      },

      "type": "mock"
    }
  };
}

/**
 *
 * @param provider
 * @param functionNameAndAlias echo or echo:prod
 * @param stage
 * @param region
 * @returns {Promise.<String>} function arn
 */
function checkIfLambdaExists(provider, functionNameAndAlias, stage, region) {
  const aliasNameOrVer = functionNameAndAlias.split(':')[1] || '',
        params         = {
          FunctionName: functionNameAndAlias,
        };

  if (!!aliasNameOrVer) {
    params.Qualifier = aliasNameOrVer;
  }

  return provider.request('Lambda',
    'getFunction',
    params,
    stage,
    region)
    .then(d => {
      return d.Configuration.FunctionArn;
    });
}