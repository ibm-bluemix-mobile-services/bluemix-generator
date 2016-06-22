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
		Cloudant = require('../modules/cloudant'),
		FastRunner = require('../modules/fast-runner');

	module.exports = {
		run: function (service, credentials, progress) {
			return new Promise(function (resolve, reject) {

				var sources = _.get(service, 'data');

				if(_.isArray(sources)) {
					var runner = new FastRunner(sources);

					runner.run(function (source) {

						var products = require(process.cwd() + '/' + _.get(source, 'path')),
							database = _.get(source, 'name'),
							serviceName = _.get(service, 'name');

						var c = new Cloudant(database, _.get(credentials, 'entity.credentials'));

						return c.dropDatabase().then(function () {
							progress('Creating ' + database);
							return c.createDatabase();
						}).then(function () {
							progress('Populating ' + database);
							return c.uploadData(products);
						}).then(function () {
							return 'Finished uploading data to ' + serviceName;
						});
					}).then(function(response){
						resolve(response);
					}).catch(function(error){
						reject(error)
					});

				} else {
					reject('Invalid generator.json, data element requires an array of datasources.');
				}
			});
		},
		onError: function (service, error, progress) {
			return Promise.reject(error);
		}
	};
})(module);
