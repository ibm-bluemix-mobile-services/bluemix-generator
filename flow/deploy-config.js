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
	var accessor = require("../modules/accessor"),
		chalk = require("chalk"),
		_ = require("lodash"),
		figures = require("figures"),
		regions = require('../config/regions'),
		flasher = require('../modules/flasher'),
		util = require('../modules/util'),
		inquirer = require('inquirer');

	var userConfig = {};

	module.exports = function (templateConfig, serviceManager, bluemix, authParams, cli) {
		userConfig = _.merge(authParams, userConfig);

		return new Promise(function (resolve, reject) {

			return new Promise(function (resolve, reject) {

				var finalRegion = {
					region: {}
				};

				if (cli.flags.region != null && cli.flags.region != true) {
					switch (cli.flags.region) {
						case "US South":
						case "ng":
							finalRegion.region = regions[0];
							resolve(finalRegion);
							break;
						case "United Kingdom":
						case "eu-gb":
							finalRegion.region = regions[1];
							resolve(finalRegion);
							break;
						case "Sydney":
						case "au-syd":
							finalRegion.region = regions[2];
							resolve(finalRegion);
							break;
						default:
							return inquirer.prompt([
								{
									type: 'asyncList',
									name: 'region',
									message: 'What is your region?',
									pull: function () {
										return regions;
									}
								}
							]).then(function (region) {
								resolve(region);
							});
					}
				} else {
						return inquirer.prompt([
							{
								type: 'asyncList',
								name: 'region',
								message: 'What is your region?',
								pull: function () {
									return regions;
								}
							}
						]).then(function (region) {
							resolve(region);
						});
				}
			}).then(function(region) {

				userConfig = _.merge(region, userConfig);
				bluemix.api().updateEndpoint({
					api: _.get(region, 'region.api')
				});
				return bluemix.api().getOrganizations();
			}).then(function (orgs) {

				return new Promise(function (resolve, reject) {

					orgs.forEach( function(org) {
						if (org.name === cli.flags.org) {
							userConfig.org = org;
						}
					});

					if (cli.flags.org != null && cli.flags.org != true && userConfig.org != null) {
						resolve(userConfig.org);
					} else {
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
							}
						]).then(function (org) {
							resolve(org);
						});
					}
				}).then(function(org) {

					return new Promise(function (resolve, reject) {

						bluemix.api().getSpaces(userConfig.org.guid).then(function (spaces) {
							spaces.forEach( function(space) {
								if (space.name === cli.flags.space) {
									userConfig.space = space;
									resolve(userConfig.space);
								}
							});
						}).then(function() {
							if (userConfig.space != null) {
								resolve(userConfig.space);
							} else {
								return inquirer.prompt([
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
									}
								]).then(function (space) {
									resolve(space);
								});
							}
						});
					}).then(function(space) {

						return new Promise(function (resolve, reject) {

							return new Promise(function (resolve, reject) {
								if (cli.flags.name != null && cli.flags.name != true) {
									util.validateAppName(cli.flags.name).then(function (name) {
										if (name === -1) {
											return false;
										} else if (name === -2) {
											return false;
										}

										return bluemix.api().checkName(name, userConfig.region.guid).then( function(result) {
											if (result === -3) {
												return false;
											}
											return name;
										});
									}).then(function(name) {
										resolve(name);
									});
								} else {
									resolve(false);
								}
							}).then(function(name) {
								if (name != false) {
									resolve(name);
								} else {
									return inquirer.prompt([
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
									]).then(function (name) {
										resolve(name.name);
									});
								}
							});
						}).then(function (name) {
							userConfig.name = name;
							resolve();
						});
					});
				});
			});
		}).then(function(){
			return userConfig;
		});
	};
})(module);
