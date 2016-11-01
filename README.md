# Serverless Swagger Plugin

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)

A [Serverless](https://serverless.com) v1.0 plugin that creates an maintains a swagger.yaml file for API Gateway (APIG).

**Why?** 

Serverless currently maintains API Gateway configuration via Cloudformation.  This does not work for us because:

-  CloudFormation [has item limits](https://github.com/serverless/serverless/issues/2387)
-  Serverless [deletes and re-creates APIG distro on every update](https://github.com/serverless/serverless/issues/2530)
-  It is not a security best practice to allow deletion of assets from an AWS API Key (can't back with MFA)
-  It is an industry standard, and the export swagger from the AWS console creates ugly and complex swagger
-  We can tie a swagger file to a release.  This can be referenced and imported at any time into tooling like postman
-  We view changes to our API Gateway before deploying to different stages
-  CloudFormation is not good for frequently changing assets because it sometimes gets into a rollback failed state.  You must delete CF and re-create.  Not fun hitting this in production

## Install

From your serverless project run:
```
npm install serverless-plugin-swag --save-dev
```

Add the plugin to your `serverless.yml` file:

```yaml
plugins:
  - serverless-plugin-swag
```

## Configure

This plugin reburies no configuration. The only configuration option is to enable CORS for EVERY endpoint. 

## Usage

## FAQ

- **Q** A


```yaml
---
swagger: "2.0"
info:
  version: "2016-09-22T21:51:08Z"
  title: "ryan-proxy-test"
host: "myuid.execute-api.us-east-1.amazonaws.com"
basePath: "/yrdy"
schemes:
- "https"
paths:
  /{proxy+}:
    options:
      consumes:
      - "application/json"
      produces:
      - "application/json"
      responses:
        200:
          description: "200 response"
          schema:
            $ref: "#/definitions/Empty"
          headers:
            Access-Control-Allow-Origin:
              type: "string"
            Access-Control-Allow-Methods:
              type: "string"
            Access-Control-Allow-Headers:
              type: "string"
      x-amazon-apigateway-integration:
        responses:
          default:
            statusCode: "200"
            responseParameters:
              method.response.header.Access-Control-Allow-Methods: "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'"
              method.response.header.Access-Control-Allow-Headers: "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
              method.response.header.Access-Control-Allow-Origin: "'*'"
        requestTemplates:
          application/json: "{\"statusCode\": 200}"
        passthroughBehavior: "when_no_match"
        type: "mock"
    x-amazon-apigateway-any-method:
      produces:
      - "application/json"
      parameters:
      - name: "proxy"
        in: "path"
        required: true
        type: "string"
      responses: {}
      x-amazon-apigateway-integration:
        responses:
          default:
            statusCode: "200"
        uri: "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:myAWSAccount:function:helloworld-proxy/invocations"
        passthroughBehavior: "when_no_match"
        httpMethod: "POST"
        cacheNamespace: "1rnijn"
        cacheKeyParameters:
        - "method.request.path.proxy"
        type: "aws_proxy"
definitions:
  Empty:
    type: "object"
    title: "Empty Schema"
```