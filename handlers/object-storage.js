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
	var ObjectStorage = require('../modules/object-storage'),
		FastRunner = require('../modules/fast-runner'),
		fs = require('fs'),
		_ = require('lodash');

	module.exports = {
		run: function (service, credentials, progress) {

			return new Promise(function (resolve, reject) {

				var sources = _.get(service, 'data');

				if(_.isArray(sources)) {
					var runner = new FastRunner(sources);

					runner.run(function (source) {
						var containerName = source.name,
								dataPath = source.path;

						var os = new ObjectStorage(containerName, credentials.entity.credentials);

						progress('Creating container ' + containerName);

						return os.validate().then(function () {
							return os.makeContainer();
						}).then(function () {
							var runner = new FastRunner(fs.readdirSync(dataPath));

							return runner.run(function (file) {
								if (!fs.lstatSync(dataPath + file).isDirectory()) {
									progress('Uploading ' + file);
									return os.uploadFile(dataPath + file, file).catch(function () {
										// TODO: error uploading file:file display warning
										return true;
									});
								}

								return true;
							}).then(function () {
								return 'Finished uploading all files to ' + service.name;
							}).catch(function (e) {
								return Promise.reject(e);
							});
						});
					}).then(function(response){
						resolve(response);
					}).catch(function(error){
						reject(error);
					});

				} else {
					reject('Invalid generator.json, data element requires an array of datasources.');
				}
			});
		},
		onError: function(service, error, progress){
			return Promise.reject(error);
		}
	};
})(module);
