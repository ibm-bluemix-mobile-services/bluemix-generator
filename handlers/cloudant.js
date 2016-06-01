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
	var _ = require('lodash'),
		Cloudant = require('../modules/cloudant');

	module.exports = {
		run: function (service, credentials, progress) {
			return new Promise(function (resolve, reject) {

				var products = require(process.cwd() + '/' + _.get(service, 'data')),
					database = _.get(service, 'db'),
					serviceName = _.get(service, 'name');

				var c = new Cloudant(database, _.get(credentials, 'entity.credentials'));

				c.dropDatabase().then(function () {
					progress('Creating ' + database);
					return c.createDatabase();
				}).then(function () {
					progress('Populating ' + database);
					return c.uploadData(products);
				}).then(function () {
					resolve('Finished uploading data to ' + serviceName);
				}).catch(function (e) {
					reject(e);
				});
			});
		},
		onError: function (service, error, progress) {
			return Promise.reject(error);
		}
	};
})(module);
