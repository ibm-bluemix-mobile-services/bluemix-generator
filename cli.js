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
	Bluemix = require('./modules/bluemix'),
	flasher = require('./modules/flasher'),
	_ = require("lodash"),
	fs = require("fs"),
	accessor = require("./modules/accessor"),
	FastRunner = require('./modules/fast-runner'),
	LocalGenerator = require('./modules/local-generator'),
	serviceManager = require('./modules/service-manager'),
	ServiceSync = require('./modules/service-sync'),
	templateConfig = null,
	environmentValidation = require('./modules/environment-validation'),
	appHome = process.cwd(),
	endpointConfig = require('./config/endpoint'),
	userConfig = {},
	userHome = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'],
	util = require('./modules/util'),
	regions = require('./config/regions');

var bluemix = Bluemix({root: userHome, endpoint: endpointConfig});

serviceManager.registerHandler('cloudantNoSQLDB', require('./handlers/cloudant'));
serviceManager.registerHandler('Object-Storage', require('./handlers/object-storage'));

serviceManager.registerTemplateHandler(appHome, chalk);

environmentValidation({root: userHome, home: appHome}).then(function (config) {
	templateConfig = config;

	return serviceManager.fireEvent('validation');
}).then(function () {
	console.log();
	console.log(require('bluemix-logo'));

	var appConfig = accessor(require('./package.json'));

	console.log(chalk.cyan.bold(appConfig.get('appName')) + ' version ' + chalk.green(appConfig.get('version')) + '\n');
	console.log(chalk.cyan.bold(templateConfig.get('app.name')));
	console.log(templateConfig.get('app.description'));
	console.log(chalk.cyan.bold('Runtime:'));
	console.log(' ' + figures.bullet + ' ' + templateConfig.get('runtime.name') + ": " + templateConfig.get('runtime.description'));
	console.log(chalk.cyan.bold('Services:'));
	templateConfig.get('services').forEach(function (service) {
		console.log(' ' + figures.bullet + ' ' + service.name + ': ' + service.description);
	});

	console.log();

	inquirer.registerPrompt('asyncList', require('./modules/async-prompt'));

	return bluemix.authenticateWithToken().catch(function () {
		return bluemix.refreshToken();
	}).catch(function () {
		return inquirer.prompt([
			{
				type: 'input',
				name: 'username',
				filter: function (username) {
					return userConfig.username = username;
				},
				message: 'What is your Bluemix username?',
				validate: function (username) {
					if (username === "" || username === "exit" || username === "quit") {
						console.log("\n\nThanks for stopping by!");
						process.exit(1);
					}
					return true;
				}
			},
			{
				type: 'password',
				name: 'password',
				message: 'What is your Bluemix password?',
				filter: function (password) {
					return bluemix.login(userConfig.username, password);
				},
				validate: function (password) {
					if (!password) {
						return 'Failed to login to Bluemix. Please try again.';
					}
					return true;
				}
			}
		]);
	});
}).then(function () {
	return inquirer.prompt([
		{
			type: 'asyncList',
			pull: function () {
				return bluemix.api().getOrganizations();
			},
			filter: function (org) {
				return userConfig.org = org;
			},
			hint: ' loading...',
			name: 'org',
			message: 'What organization would you like to use?'
		},
		{
			type: 'asyncList',
			pull: function () {
				return bluemix.api().getSpaces(userConfig.org.guid);

			},
			filter: function (space) {
				return userConfig.space = space;
			},
			hint: ' loading...',
			name: 'space',
			message: 'What space do you want to deploy to?',
		},
		{
			type: 'input',
			name: 'name',
			message: 'What do you want to name this backend?',
			filter: function (answer) {
				return util.validateAppName(answer).then(function (name) {
					return bluemix.exist(name);
				});
			},
			validate: function (value) {
				if (_.size(value) > 0) {
					return true;
				} else if (value === -1) {
					return 'Sorry, name can only contain alphanumeric characters and dash character, must not begin or end with the dash character.';

				} else if (value === -2) {
					return 'Sorry, name cannot be more than 63 characters long.';
				}

				return 'Sorry, that name already exists. Please try another name.';
			}
		},
		{
			type: 'list',
			name: 'region',
			message: 'What is your region?',
			choices: regions
		}
	]);

}).then(function (userResponse) {

	var preferences = _.merge(userResponse, userConfig);

	flasher.progress('Synchronizing Bluemix Services');

	var sync = new ServiceSync(bluemix.api()),
		prefs = accessor(preferences),
		generator = new LocalGenerator(prefs.get('name'));

	return serviceManager.fireEvent('preferences', util.appConfig(preferences)).then(function () {
		var serviceConfig = _.cloneDeep(templateConfig.get('services'));
		return sync.pullServices(serviceConfig, prefs.get('space.guid'))
	}).then(function (services) {
		flasher.stop();
		var runner = new FastRunner(templateConfig.get('services'));

		return runner.run(function (service) {

			var serviceType = _.get(service, 'type'),
				serviceInstance = _.get(services, serviceType, false),
				useExistingServiceExecutor = Promise.resolve();

			if (!serviceInstance) {
				return Promise.reject('Service is not available');
			} else if (_.has(serviceInstance, 'services') && _.isArray(serviceInstance.services)) {

				var options = serviceInstance.services.map(function (option) {
					return {
						name: option.name,
						value: option.guid
					}
				});
				options.push(new inquirer.Separator());
				options.push({
					name: 'Provision new instance',
					value: -1
				});

				useExistingServiceExecutor = inquirer.prompt([
					{
						type: 'list',
						name: 'instance',
						message: 'Select the instance of ' + service.name,
						choices: options
					}
				]).then(function (selection) {
					var guid = _.get(selection, 'instance');

					if (guid < 0) {
						return Promise.reject(-1);
					}

					return bluemix.api().getServiceInstanceDetails(guid);
				}).then(function (serviceDetails) {

					generator.addService(serviceDetails.name);

					return bluemix.api().getServiceKeys(serviceDetails.guid).then(function (serviceKeys) {
						return Promise.resolve({keys: serviceKeys, service: serviceDetails})
					});
				}).then(function (serviceCredentials) {
					if (serviceCredentials.keys.length === 0) {
						var serviceKeyName = prefs.get('name') + '-' + service.deployname + '-credentials';

						return bluemix.api().createServiceKeys(serviceCredentials.service.guid, serviceKeyName);
					}

					return Promise.resolve(serviceCredentials.keys[0]);
				}).catch(function (e) {
					if (e !== -1) {
						console.log(chalk.bold.yellow('INFO: '), 'Unable to bind to service, provisioning new instances.');
					}
					return Promise.resolve();
				});
			}

			return useExistingServiceExecutor.then(function (config) {

				flasher.stop();

				if (config) {
					return Promise.resolve(config);
				}

				return bluemix.api().getServiceLevels(service.type).then(function (plans) {
					flasher.stop();

					var plan = plans.reduce(function (one, two) {
						var servicePlan = _.get(service, 'plan');

						if (_.get(one, 'name') === servicePlan) {
							return one;
						} else if (_.get(two, 'name') === servicePlan) {
							return two;
						}
					}, null);

					var serviceName = prefs.get('name') + '-' + service.deployname;

					if (!plan) {

						flasher.stop();

						return inquirer.prompt([
							{
								type: 'list',
								name: 'plan',
								message: 'Select your plan for ' + service.name,
								choices: plans.map(function (plan) {
									return {
										name: plan.name,
										value: plan.guid
									}
								})
							}
						]).then(function (selection) {
							flasher.progress("Provisioning " + service.name);

							return bluemix.api().createServiceInstance(prefs.get('space.guid'), selection.plan, serviceName);
						});
					}

					flasher.progress("Provisioning " + service.name);

					generator.addService(serviceName);

					return bluemix.api().createServiceInstance(prefs.get('space.guid'), plan.guid, serviceName);
				});
			}).then(function (credentials) {

				return serviceManager.fireEvent('service', util.serviceInstance(service, credentials)).then(function () {
					return serviceManager.run(service, credentials, function (message) {
						flasher.stop();

						flasher.progress(message);
					});
				}).then(function (message) {
					flasher.stop();

					if (message) {
						flasher.log(message);
					}

					return Promise.resolve(message);
				});

			}).catch(function (error) {
				flasher.stop();

				return serviceManager.handleFailure(service, error, function (message) {

					flasher.stop();

					flasher.progress(message);

				}).then(function () {
					flasher.stop();

					if (message) {
						flasher.log(message);
					}

					return Promise.resolve(message);
				}).catch(function (error) {
					flasher.stop();

					var errorMessage = _.has(error, 'response.body.description') ? _.get(error, 'response.body.description') : error;

					return Promise.reject(errorMessage);
				});
			});
		});
	}).then(function () {
		return Promise.resolve(generator);
	});
}).then(function (generator) {
	return generator.createProject().then(function () {
		return generator.createManifest();
	}).then(function () {
		return serviceManager.fireEvent('complete', {home: generator.getProjectPath()});
	});
}).then(function (message) {
	console.log(message);
}).catch(function (error) {
	console.log(chalk.red.bold('error:\n'), error, '\n');
});
