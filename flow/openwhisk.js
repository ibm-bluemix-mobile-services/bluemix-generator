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
	var chalk = require("chalk"),
		_ = require("lodash"),
		flasher = require('../modules/flasher'),
		OpenWhiskApiClient = require('../modules/openwhisk-api-client'),
		OpenWhiskApi = require('../modules/openwhisk-api'),
		FastRunner = require('../modules/fast-runner'),
		fs = require('fs');

	var openWhiskClient = new OpenWhiskApiClient('https://openwhisk.ng.bluemix.net');

	module.exports = function (templateConfig, serviceManager, bluemix, deploySettings) {

		var openWhiskActions = templateConfig.get('openwhisk');

		if (!openWhiskActions) {
			return Promise.resolve();
		}


		console.log(chalk.bold.cyan('OpenWhisk: '));

		var openWhiskApi = new OpenWhiskApi(openWhiskClient);

		return bluemix.getAuthTokens().then(function (tokens) {
			return openWhiskApi.authenticate(tokens);
		}).then(function () {

			var org = _.get(deploySettings, 'org.value'),
				space = _.get(deploySettings, 'space.value'),
				runner = new FastRunner(openWhiskActions);

			return runner.run(function (action) {

				var actionName = _.get(action, 'action'),
					actionType = _.get(action, 'type'),
					actionCodeSnippet = fs.readFileSync(process.cwd() + '/' + _.get(action, 'code'), 'utf8');

				var actionDetails = ' (' + actionName + ')[' + actionType + ']. ';

				flasher.progress('Creating action' + actionDetails);


				return openWhiskApi.createAction(org, space, actionName, actionType, actionCodeSnippet).then(function (result) {
					flasher.stop();

					console.log(chalk.cyan('SUCCESS: '), 'Created action' + actionDetails);

					return result;
				}).catch(function (error) {
					flasher.stop();
					var errorMessage = 'Could not create action' + actionDetails;

					if (_.has(error, 'error')) {
						errorMessage += _.get(error, 'error');
					}

					console.log(chalk.bold.yellow('INFO: '), errorMessage);
				});
			})

		}).catch(function () {
			return Promise.resolve();
		});

	};
})(module);
