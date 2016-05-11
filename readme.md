# Bluemix Backend Generator
[![npm version](https://badge.fury.io/js/bluemix-generator.svg)](https://badge.fury.io/js/bluemix-generator)
[![dependencies](https://david-dm.org/ibm-bluemix-mobile-services/bluemix-generator.svg?theme=shields.io)](https://david-dm.org/ibm-bluemix-mobile-services/bluemix-generator)

![](readme/bluegen.gif)

## CLI

```sh
$ npm install -g bluemix-generator
$ bluegen
```
## What is it?

The Bluemix Backend Generator, or **bluegen**, is a cross-platform tool developed by the CORD team to quickly generate complex backends for samples and templates using IBM Bluemix. The tool provisions requested services, populates them with user-defined data, scaffolds template code, and sets up the template for fast and easy deployment to Bluemix.

In addition, **bluegen** supports event-based custom service handlers that let a developer customize his or her template.

**Note:** This package is not intended for production environments

### Specifications
For **bluegen** to work, the template repository must be in the following format:

    data/ (optional)
    template/
    generator.js (optional)
    generator.json

The `data/` directory is optional, but recommended if you are provisioning the Cloudant NoSQL DB or Object Storage services. The `template/` directory holds the files you want to scaffold, and the `generator.json` defines the runtime and services of your application.

Below is a sample `generator.json` file:

```json
{
	"app": {
		"name": "Store Catalog Mobile Backend for Bluemix",
		"description": "The Store Catalog Mobile Backend is a template that demonstrates Mobile Services integration with API Connect, \nCloudant NoSQL DB, and Object Storage services on Bluemix. The template exhibits common architectural design patterns \nthat developers can use to model their backend on Bluemix for mobile applications."
	},
	"runtime": {
		"name": "Node.js",
		"description": "API Connect with Loopback"
	},
	"services": [
	{
		"name": "Cloudant NoSQL Database",
		"deployname": "cloudantdb",
		"description": "Massively scalable, secure, and continuously operational database",
		"type": "cloudantNoSQLDB",
		"plan": "Shared",
		"db": "products",
		"data": "data/cloudant/products.json"
	},
	{
		"name": "Object Storage",
		"deployname": "objectstorage",
		"description": "Unstructured cloud data store",
		"type": "Object-Storage",
		"plan": "Free",
		"container": "clothes",
		"data": "data/objectstorage/clothes/"
	}
	]
}
```

Custom service handlers are also optionally supported, so you can specify actions to be taken after a specific service is provisioned by modifying the `generator.js`.

Below is a sample `generator.js` file:

```javascript
(function (module) {

	var fs = require('fs'),
		exec = require('child_process').exec;

	module.exports = function (app) {

		var config = {
			app: {},
			services: {}
		};

		app.events.on('validation', function (event, resolve, reject) {
			exec('which apic', function (error, stdout) {
				if (stdout.trim().length === 0) {
					return reject('Please install the API Connect CLI.\n' +
						'To install, type the command `npm install -g apiconnect` in your terminal.');
				}

				resolve();
			})
		});

		app.events.on('preferences', function (event, resolve) {
			resolve(config.app = event);
		});

		app.events.on('service', function (event, resolve) {
			resolve(config.services[event.type] = event);
		});

		app.events.on('complete', function (event, resolve) {

			var cloudantService = config.services['cloudantNoSQLDB'],
				path = event.home + '/server/';

			saveFile(path + 'datasources.json', JSON.stringify({
				'Cloudant': {
					database: cloudantService.db,
					username: cloudantService.credentials.username,
					password: cloudantService.credentials.password,
					name: 'Cloudant',
					connector: 'cloudant'
				}
			})).then(function () {
				var services = {};

				Object.keys(config.services).forEach(function (key) {
					services[key] = [];
					services[key].push(config.services[key]);
				});

				return saveFile(path + 'env.json', JSON.stringify(services));
			}).then(function () {
				console.log('Finished copying template\n');
				console.log('Your project has been created at ' + app.text.yellow('projects/') + app.text.yellow(config.app.name) + '\n');
				console.log('Next steps:\n');
				console.log('  Navigate to your project directory');
				console.log(app.text.green('    $ cd ') + app.text.yellow('projects/') + app.text.yellow(config.app.name) + '\n');
				console.log('  Upload your backend to Bluemix');
				console.log(app.text.green('    $ cf login -a ') + app.text.yellow(config.app.region) + app.text.green(' -u ') + app.text.yellow(config.app.username) + app.text.green(' -o ') +  app.text.yellow(config.app.org.name) + app.text.green(' -s ') +  app.text.yellow(config.app.space.name));
				console.log(app.text.green('    $ cf push\n'));
				console.log('  Compose your API, run, manage, enforce, and deploy it with API Connect');
				console.log(app.text.green('    $ npm install'));
				console.log(app.text.green('    $ apic edit\n'));
			}).catch(function (e) {
				console.log('  ' + app.text.red.bold('error'), e);
				resolve();
			});
		});

		function saveFile(path, data) {
			return new Promise(function (resolve, reject) {
				fs.writeFile(path, data, function (err) {
					if (err) {
						return reject('Could not save `' + path + '` file.');
					}

					resolve();
				});
			});
		}
	};
})(module);
```

The `generator.js` has event triggers using Promises allowing custom JavaScript code to execute that is specifically tailored for your template.

For the above sample, we provide custom triggers on validation to make sure the user has API Connect installed, an event on the service provisioning completion to use service keys to generate custom files, and finally log directions that the user can follow after the completion event.

If the event handler completes successfully, the function will `resolve()`.

### License
This package contains sample code provided in source code form. The samples are licensed under the Apache License, Version 2.0 (the "License"). You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 and may also view the license in the license file within this package.
