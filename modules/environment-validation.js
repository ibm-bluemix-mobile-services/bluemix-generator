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
	var exec = require('child_process').exec,
		_ = require('lodash'),
		accessor = require('./accessor'),
		util = require('./util'),
		fs = require('fs');

	module.exports = function (config) {

		function makeMetadataDirectory() {
			return util.createMetadataDirectory(config.root).then(function () {
				return util.createMetadataDirectory(config.home);
			});
		}

		function isCloudFoundryInstalled() {
			return new Promise(function (resolve, reject) {
				exec("which cf", function (error, stdout) {
					if (stdout.trim().length === 0) {
						return reject('Please install the Cloud Foundry CLI.\n' +
							'To install, visit and follow the directions from the official https://github.com/cloudfoundry/cli repository.')
					}

					resolve();
				})
			});
		}

		function isTemplateDirectory() {
			return util.fileExists(config.home + '/generator.json').catch(function () {
				return Promise.reject('Please navigate to a valid template directory');
			});
		}

		function isProjectDirectory() {
			return util.fileExists(config.home + '/.generator/generator.json').catch(function () {
				return Promise.reject('Please navigate to a valid template directory');
			});
		}

		function generatorError(message) {
			return 'Invalid generator.json: ' + message;
		}

		function isConfigMissingProperties(generator) {
			var errors = [];

			if (!_.has(generator, 'app.name')) {
				errors.push('app.name');
			}

			if (!_.has(generator, 'app.description')) {
				errors.push('app.description');
			}

			if (!_.has(generator, 'runtime.name')) {
				errors.push('runtime.name');
			}

			if (!_.has(generator, 'runtime.description')) {
				errors.push('runtime.description');
			}

			if (errors.length > 0) {
				return Promise.reject(generatorError(errors.join(', ') + ' ' + verb(errors) + ' missing'));
			}

			return Promise.resolve();
		}

		function verb(count) {
			if (_.isArray(count)) {
				count = count.length;
			}

			return count > 1 ? 'are' : 'is';
		}

		function areConfigServicesOK(generator) {
			if (_.has(generator, 'services') && _.isArray(generator.services)) {

				var errors = [];


				_.forEach(generator.services, function (service, index) {
					var prefix = 'service[' + index + ']';

					if (!_.has(service, 'name')) {
						errors.push(prefix + '.name');
					}
					if (!_.has(service, 'deployname')) {
						errors.push(prefix + '.deployname');
					}
					if (!_.has(service, 'description')) {
						errors.push(prefix + '.description');
					}
					if (!_.has(service, 'type')) {
						errors.push(prefix + '.type');
					}
				});

				if (errors.length > 0) {
					return Promise.reject(generatorError(errors.join(', ') + ' ' + verb(errors) + ' missing'));
				}

				return Promise.resolve();
			}

			return Promise.resolve();
		}

		function validateGenerator(path) {
			try {
				var generator = require(path);

				return isConfigMissingProperties(generator).then(function () {
					return areConfigServicesOK(generator);
				}).then(function () {
					return Promise.resolve(accessor(generator));
				});
			} catch(e) {
				return Promise.reject(-1);
			}
		}

		return isCloudFoundryInstalled().then(function () {
			return isTemplateDirectory().then(function (path) {
				return makeMetadataDirectory().then(function () {
					return validateGenerator(path);
				});
			}).then(function (config) {
				return {status: 'generate', config: config};
			}).catch(function (error) {
				if(error == -1) {
					throw 'Invalid generator.json file.';
				}

				return isProjectDirectory().then(function (path) {
					return validateGenerator(path);
				}).then(function (config) {
					return {status: 'reload', config: config};
				});
			});
		});

	};
})(module);
