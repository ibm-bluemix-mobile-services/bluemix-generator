<img src="readme/logo.png" alt="bluemix logo" width="250px"/>

## Bluemix Generator
Generate backend templates for Bluemix

[![](https://shields.eu-gb.mybluemix.net)](https://bluemix.net)
[![](https://shields.eu-gb.mybluemix.net/ibm-bluemix-mobile-services/bluemix-generator)](https://travis-ci.org/ibm-bluemix-mobile-services/bluemix-generator)

### Table of Contents
 * [CLI](#cli)
 * [Demo](#demo)
 * [Summary](#summary)
 * [Specifications](#specifications)
 * [Examples](#examples)
 * [Redeploying data](#redeploying-data)
 * [Contributing](#contributing)
 * [License](#license)

### CLI

```sh
$ npm install -g bluemix-generator
$ bluegen
```

### Demo
![](readme/bluegen.gif)

### Summary

The Bluemix Generator, or **bluegen**, is a cross-platform tool developed by the CORD team to quickly generate complex backends for samples and templates using IBM Bluemix. The tool provisions requested services, populates them with user-defined data, scaffolds template code, and sets up a new project for fast and easy deployment to Bluemix.

In addition, **bluegen** supports event-based custom service handlers that let a developer specifically tailor his or her template with dynamically-generated files, messages, and actions for a user.

> **Note:** This package is not intended for production environments

### Specifications
For **bluegen** to work, the template repository must be in the following format:

    data/
    template/
    generator.js (optional)
    generator.json

The `data/` directory is required as **bluegen** copies the contents of this folder into your newly generated project for redeployment. The `template/` directory holds the files you want to scaffold, and the `generator.json` defines the runtime and services of your application.

For your `generator.json` to be valid, it requires the following fields:

```
app.name
app.description

runtime.name
runtime.description
```

For each service to be valid, it requires the following fields:
```
service.name
service.deployname
service.description
service.type
```

> **Note:** Currently the only built-in service handlers are for **Cloudant NoSQL DB** and **Object Storage**

#### Custom Service Handlers

Custom service handlers are also optionally supported, so you can specify actions to be taken after a specific service is provisioned by adding a `generator.js`.

There are currently four events that are triggered:

1. **validation:**
The validation event is triggered immediately when the application is started. It can be used to verify the user's environment.

2. **preferences:**
The preferences event is triggered after a user goes through the interactive prompt. It contains data like the organization, space, and application name.

3. **service:**
The service event is triggered immediately after each service specified in the configuration file is provisioned. It contains the service credentials that Bluemix returns for that particular service.

4. **complete:**
The complete event triggers after the template is set up and services provisioned. Here we can specify instructions for how the user should run the new project.

### Examples
The [examples/](examples) directory in this repository links to the current backends that are using the Bluemix Generator.

### Redeploying data

Simply run the command `bluegen` inside your project directory to redeploy data to **Cloudant NoSQL DB** and **Object Storage**.

![](readme/redeploy.gif)

### Contributing
We welcome those who wish to contribute. Please see the [contributing guidlines](contributing.md).

### License
This package contains sample code provided in source code form. The samples are licensed under the Apache License, Version 2.0 (the "License"). You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 and may also view the license in the license file within this package.
