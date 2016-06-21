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
		figures = require("figures"),
		regions = require('../config/regions'),
		flasher = require('../modules/flasher'),
		util = require('../modules/util'),
		inquirer = require('inquirer');

	var userConfig = {};

	module.exports = function (templateConfig, serviceManager, bluemix, token) {

		var promise = Promise.reject();

		if(token) {
			promise = bluemix.authenticateWithToken().catch(function () {
				return bluemix.refreshToken();
			});
		}

		return promise.catch(function () {
			flasher.stop();
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
	};
})(module);
