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

(function (module) {
	var accessor = require("../modules/accessor"),
		chalk = require("chalk"),
		_ = require("lodash"),
		figures = require("figures"),
		regions = require('../config/regions'),
		flasher = require('../modules/flasher'),
		ServiceSync = require('../modules/service-sync'),
		FastRunner = require('../modules/fast-runner'),
		LocalGenerator = require('../modules/local-generator'),
		util = require('../modules/util'),
		inquirer = require('inquirer');

	var userConfig = {};

	module.exports = function (templateConfig, serviceManager, bluemix, userResponse) {
		userConfig = _.merge(userResponse, userConfig);
		return inquirer.prompt([
			{
				type: 'list',
				name: 'region',
				message: 'What is your region?',
				choices: regions
			}
		]).then(function (response) {

			userConfig = _.merge(response, userConfig);

			bluemix.api().updateEndpoint({
				api: _.get(response, 'region')
			});

			return bluemix.api().getOrganizations();
		}).then(function (orgs) {
			if (orgs.length === 0) {
				return Promise.reject('You don\'t have any organizations in this region. Please create a new org or select a different region.');
			}

			return inquirer.prompt([
				{
					type: 'asyncList',
					pull: function () {
						return orgs;
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
							return bluemix.api().checkName(name);
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

					flasher.log(chalk.cyan.bold(service.name));

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

							flasher.progress('Fetching service details for ' + service.name);

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

						var boundServiceInstance = service;
						boundServiceInstance.credentials = credentials;
						generator.bindServices(boundServiceInstance);

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
				flasher.stop();
				return Promise.resolve(generator);
			});
		}).then(function (generator) {
			return generator.createProject(templateConfig).then(function () {
				return generator.createManifest();
			}).then(function () {
				return serviceManager.fireEvent('complete', {home: generator.getProjectPath()});
			});
		})
	};
})(module);
