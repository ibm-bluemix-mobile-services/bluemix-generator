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
	var fs = require('fs'),
		accessor = require('./accessor');
		_ = require('lodash');

	module.exports = {
		fileExists: function (path) {
			return new Promise(function (resolve, reject) {
				fs.exists(path, function (exists) {
					if (exists) {
						return resolve(path);
					}

					reject();
				})
			});
		},
		createDirectory: function (path) {
			return this.fileExists(path).catch(function(){
				return new Promise(function(resolve){
					fs.mkdir(path, function () {
						resolve(path);
					});
				})
			});
		},
		createMetadataDirectory: function (path) {
			return this.createDirectory(path + '/.generator');
		},
		validateAppName: function (name) {
			if (!name.match(/^[a-zA-Z0-9](([a-zA-Z0-9-]+)?[a-zA-Z0-9])?$/g)) {
				return Promise.resolve(-1);
			} else if (name.length > 63) {
				return Promise.resolve(-2);
			}

			return Promise.resolve(name);
		},
		appConfig: function (userPreferences) {
			return accessor({
				username: _.get(userPreferences, 'username'),
				region: _.get(userPreferences, 'region'),
				org: {
					name: _.get(userPreferences, 'org.name'),
					guid: _.get(userPreferences, 'org.guid')
				},
				space: {
					name: _.get(userPreferences, 'space.name'),
					guid: _.get(userPreferences, 'space.guid')
				},
				name: _.get(userPreferences, 'name')
			});
		},
		serviceInstance: function (service, credentials) {
			return _.merge(service, {
				credentials: _.get(credentials, 'entity.credentials')
			});
		}
	};
})(module);
