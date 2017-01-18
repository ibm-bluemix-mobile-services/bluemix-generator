/*
 * Copyright 2016, 2017 IBM Corp.
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

	var _ = require("lodash"),
		accessor = require("../modules/accessor"),
		chalk = require("chalk"),
		figures = require("figures"),
		regions = require('../config/regions'),
		flasher = require('../modules/flasher'),
		FastRunner = require('../modules/fast-runner'),
		util = require('../modules/util'),
		inquirer = require('inquirer');

	module.exports = function (templateConfig, serviceManager) {
		var runner = new FastRunner(templateConfig.get('services'));

		return runner.run(function (service) {

			var serviceName = _.get(service, 'name'),
				serviceCredentials = _.get(service, 'credentials');


			if (_.get(service, "redeploy", false)) {
				return inquirer.prompt([
					{
						type: 'confirm',
						name: 'run',
						message: 'Would you like to redeploy data for ' + serviceName
					}
				]).then(function (response) {

					flasher.log(chalk.cyan.bold(serviceName));

					if (response.run) {
						flasher.progress("Initiating ");

						return serviceManager.fireEvent('service', util.serviceInstance(service, serviceCredentials));
					}

					flasher.log('Did not redeploy data for ' + serviceName);
					return Promise.reject(1);
				}).then(function () {
					return serviceManager.run(service, serviceCredentials, function (message) {
						flasher.stop();

						flasher.progress(message);
					});
				}).then(function (message) {
					flasher.stop();

					if (message) {
						flasher.log(message);
					}

					return Promise.resolve();
				}).catch(function (error) {
					flasher.stop();

					if(error === 1) {
						return Promise.resolve();
					}

					return serviceManager.handleFailure(service, error, function (message) {

						flasher.stop();

						flasher.progress(message);

					}).then(function (message) {
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
			}

			return Promise.resolve();

		});
	};
})(module);
