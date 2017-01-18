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
	var pkgcloud = require('pkgcloud'),
		fs = require('fs');

	function ObjectStorage(container, credentials) {
		this.container = container;

		this.config = {
			provider: 'openstack',
			useServiceCatalog: true,
			useInternal: false,
			keystoneAuthVersion: 'v3',
			authUrl: credentials.auth_url,
			tenantId: credentials.projectId,
			domainId: credentials.domainId,
			username: credentials.username,
			password: credentials.password,
			region: credentials.region
		};

		this.client = pkgcloud.storage.createClient(this.config);
	}

	ObjectStorage.prototype.validate = function () {
		return new Promise(function (resolve, reject) {
			this.client.auth(function (error) {
				if (error) {
					return reject(error);
				}

				resolve();
			});
		}.bind(this));
	};

	ObjectStorage.prototype.makeContainer = function () {
		return new Promise(function (resolve, reject) {

			this.client.createContainer({name: this.container}, function (error) {
				if (error) {
					return reject(error);
				}

				return resolve();
			});

		}.bind(this));
	};

	ObjectStorage.prototype.uploadFile = function (path, name) {
		return new Promise(function (resolve, reject) {

			var myPicture = fs.createReadStream(path);

			var upload = this.client.upload({
				container: this.container,
				remote: name
			});

			upload.on('error', function (error) {
				reject(error);
			});

			upload.on('success', function (file) {
				resolve(file);
			});

			myPicture.pipe(upload);
		}.bind(this));
	};

	module.exports = ObjectStorage;
})(module);
