#!/usr/bin/env node
/*
 * Copyright 2016 IBM Corp.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

var inquirer = require('inquirer'),
	chalk = require("chalk"),
	colors = require('colors'),
	figures = require("figures"),
	meow = require("meow"),
	Bluemix = require('./modules/bluemix'),
	flasher = require('./modules/flasher'),
	fs = require("fs"),
	accessor = require("./modules/accessor"),
	serviceManager = require('./modules/service-manager'),
	environmentValidation = require('./modules/environment-validation'),
	appHome = process.cwd(),
	endpointConfig = require('./config/endpoint'),
	userHome = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'],
	util = require('./modules/util'),
	flowGenerate = require('./flow/generate'),
	flowReload = require('./flow/reload'),
	flowAuthenticate = require('./flow/authenticate'),
	flowDeployConfig = require('./flow/deploy-config'),
	flowOpenwhisk = require("./flow/openwhisk"),
	regions = require('./config/regions');

serviceManager.registerHandler('cloudantNoSQLDB', require('./handlers/cloudant'));
serviceManager.registerHandler('Object-Storage', require('./handlers/object-storage'));

serviceManager.registerTemplateHandler(appHome, chalk);

environmentValidation({root: userHome, home: appHome}).then(function (environment) {

	console.log();
	console.log(require('bluemix-logo'));

	const cli = meow(`
    Usage`
    + chalk.green("\n      $ bluegen\n    ") +

    `Options`
      + chalk.green("\n      --username") + `, ` + chalk.green("-u  ") +  `Set your Bluemix username`
      + chalk.green("\n      --password") + `, ` + chalk.green("-p  ") +  `Set your Bluemix password`
      + chalk.green("\n      --region") + `, ` + chalk.green("  -r  ") +  `Set your Bluemix region (US South, United Kingdom, Sydney)`
      + chalk.green("\n      --org") + `, ` + chalk.green("     -o  ") +  `Set your Bluemix organization`
      + chalk.green("\n      --space") + `, ` + chalk.green("   -s  ") +  `Set your Bluemix space`
      + chalk.green("\n      --name") + `, ` + chalk.green("    -n  ") +  `What you want to name your backend

    Examples`
       + chalk.green("\n      $ bluegen -u ") + chalk.yellow("jmeis@us.ibm.com ") + chalk.green("-r ") + chalk.yellow("ng ") + chalk.green("-o ") + chalk.yellow("jmeis@us.ibm.com ") + chalk.green("-s ") + chalk.yellow("dev ") + chalk.green("-n ") + chalk.yellow("mybackend\n      ") +
      `🤖  Scaffolds a new project called "mybackend" 👾
	`, {
    alias: {
        u: 'username',
        p: 'password',
        r: 'region',
        o: 'org',
        s: 'space',
        n: 'name'
    }
	});

	var appConfig = accessor(require('./package.json'));

	console.log(chalk.cyan.bold(appConfig.get('appName')) + ' version ' + chalk.green(appConfig.get('version')) + '\n');

	console.log(chalk.cyan.bold(environment.config.get('app.name')));
	console.log(environment.config.get('app.description'));
	console.log(chalk.cyan.bold('Runtime:'));
	console.log(' ' + figures.bullet + ' ' + environment.config.get('runtime.name') + ": " + environment.config.get('runtime.description'));
	console.log(chalk.cyan.bold('Services:'));
	environment.config.get('services').forEach(function (service) {
		console.log(' ' + figures.bullet + ' ' + service.name + ': ' + service.description);
	});

	console.log();

	inquirer.registerPrompt('asyncList', require('./modules/async-prompt'));

	var bluemix = Bluemix({root: userHome, endpoint: endpointConfig});

	flasher.progress('Validating Environment');
	return serviceManager.fireEvent('validation').then(function () {
		flasher.stop();
		flasher.progress('Authenticating');

		return flowAuthenticate(environment.config, serviceManager, bluemix, process.env['BLUEGEN_TOKEN_AUTH'], cli);
	}).then(function (authParams) {
		flasher.stop();

		if (environment.status === 'generate') {
			return flowDeployConfig(environment.config, serviceManager, bluemix, authParams, cli).then(function (deploySettings) {

				return flowOpenwhisk(environment.config, serviceManager, bluemix, deploySettings).then(function () {
					return flowGenerate(environment.config, serviceManager, bluemix, deploySettings);
				});
			});
		} else if (environment.status === 'reload') {
			return flowReload(environment.config, serviceManager);
		} else {
			return Promise.reject('Please navigate to a valid bluegen template folder');
		}
	});
}).then(function (message) {
	flasher.stop();
	if (message) {
		console.log(message);
	}
}).catch(function (error) {
	flasher.stop();
	console.log(chalk.red.bold('error:\n'), error, '\n');
});
