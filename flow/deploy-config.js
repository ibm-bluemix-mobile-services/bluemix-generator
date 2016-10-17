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
		util = require('../modules/util'),
		inquirer = require('inquirer');

	var userConfig = {};

	module.exports = function (templateConfig, serviceManager, bluemix, authParams) {
		userConfig = _.merge(authParams, userConfig);
		return inquirer.prompt([
			{
				type: 'asyncList',
				name: 'region',
				message: 'What is your region?',
				pull: function () {
					return regions;
				}
			}
		]).then(function (response) {

			userConfig = _.merge(response, userConfig);

			bluemix.api().updateEndpoint({
				api: _.get(response, 'region.api')
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
							return bluemix.api().checkName(name, userConfig.region.guid);
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

		}).then(function(response){
			return _.merge(response, userConfig);
		});
	};
})(module);
