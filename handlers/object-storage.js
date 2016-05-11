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

				var os = new ObjectStorage(service.container, credentials.entity.credentials);

				os.validate().then(function () {
					progress('Creating container ' + os.container);
					return os.makeContainer();
				}).then(function () {
					var runner = new FastRunner(fs.readdirSync(service.data));

					runner.run(function (file) {
						return new Promise(function (resolveChild) {
							if (!fs.lstatSync(service.data + file).isDirectory()) {
								progress('Uploading ' + file);
								return os.uploadFile(service.data + file, file).then(function () {
									resolveChild();
								}).catch(function () {
									// TODO: error uploading file:file
									resolveChild();
								});
							}

							return resolveChild();
						});
					}).then(function () {
						resolve('Finished uploading all files to ' + service.name);
					}).catch(function (e) {
						// TODO: caught some error
						reject(e);
					});
				});
			});
		},
		onError: function(service, error, progress){
			return Promise.reject(error);
		}
	};
})(module);
