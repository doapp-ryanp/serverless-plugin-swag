# Serverless Swagger Plugin

**NOTE:** This plugin is currently under development

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)

A [Serverless](https://serverless.com) v1.0 plugin that generates swagger.yaml for API Gateway (APIG) and uses AWS APIs to manage HTTP evented Lambdas.

## Why? 

Serverless currently maintains API Gateway and Lambda via Cloudformation.  This does not work for us because:

**CloudFormation (CF):**
-  CloudFormation [has item limits](https://github.com/serverless/serverless/issues/2387)
-  It is not a security best practice to allow deletion of assets from an AWS API Key (can't back with MFA)
-  CloudFormation is very powerful.  We like to visually validate (via diff and CF web UI diff function) exactly what is going to change.
-  Serverless [deletes and re-creates APIG distro on every update](https://github.com/serverless/serverless/issues/2530)
-  CloudFormation is not good for frequently changing assets because it sometimes gets into a rollback failed state.  You must delete CF and re-create.  Not fun hitting this in production
-  CloudFormation does not stay on top of new AWS features

**We prefer Swagger:**
-  It is an industry standard, and the "export swagger" from APIG web UI creates ugly and complex swagger
-  We can tie a swagger file to a release.  This can be referenced and imported at any time into tooling like postman
-  We manually review changes to our API Gateway before deploying to different stages


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

This plugin minimal configuration under the `custom.swag` namespace.  Only `custom.swag.apigId` is required. Here is an example: 

```yaml
custom:
  swag:
    globalCORS: 
      allowOrigins: "*"
      allowHeaders: "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token"
      allowMethods: "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT"
    apigId: ${self:custom.${self:provider.stage}.apigId}
  dev:
    profile: aws-dev
    apigId: "yhpgg2j123"
  prod:
    profile: aws-prod
    apigId: "yhpgg2j123"

provider:
  name: aws
  runtime: nodejs4.3
  stage: dev
  region: us-east-1
  deploymentBucket: ${self:provider.stage}-useast1-slsdeploys.alaynapage.org
  profile: ${self:custom.${self:provider.stage}.profile}
  iamRoleStatements:
    - Effect: "Allow"
      Action:
        - "lambda:InvokeFunction"
      Resource: "*"
    - Effect: "Allow"
      Action:
        - "s3:G*"
        - "s3:L*"
      Resource: "*"

functions:
  pageGet:
    name: ${self:provider.stage}-${self:service}-pageGet
    description: create Alayna Page
    handler: pages/pageget.hello
    memorySize: 512
    timeout: 10 # optional, default is 6

  pageUpdate:
    name: ${self:provider.stage}-${self:service}-pageUpdate
    description: update Alayna Page
    handler: pages/pageupdate.hello
    memorySize: 512
    timeout: 10 # optional, default is 6    
```
## Usage

## FAQ

- **Q** A


Tmp Backup for me
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