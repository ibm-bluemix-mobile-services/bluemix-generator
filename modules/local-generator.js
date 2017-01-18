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
	var memFs = require('mem-fs'),
		util = require('./util'),
		editor = require('mem-fs-editor'),
		yaml = require('json2yaml'),
		store = memFs.create(),
		fs = editor.create(store);

	function LocalGenerator(appName, domain) {
		this.manifest = {
			"path": ".",
			"memory": "512M",
			"instances": 1,
			"domain": domain,
			"name": appName,
			"host": appName,
			"disk_quota": "1024M",
			"services": []
		};

		this.root = process.cwd();
		this.boundServices = [];
	}

	LocalGenerator.prototype.addService = function (service) {
		this.manifest.services.push(service);
	};

	LocalGenerator.prototype.bindServices = function (service) {
		this.boundServices.push(service);
	};

	LocalGenerator.prototype.createProject = function (config) {

		var configuration = config.toJSON();
		configuration.services = this.boundServices;

		return new Promise(function (resolve) {
			fs.copy(this.root + '/template/', this.getProjectPath());
			fs.copy(this.root + '/template/.*', this.getProjectPath());
			fs.copy(this.root + '/data/', this.getProjectPath() + '/data');

			util.createMetadataDirectory(this.getProjectPath()).then(function (path) {
				fs.write(path + '/generator.json', JSON.stringify(configuration));

				fs.commit(function () {
					resolve();
				});
			}.bind(this));
		}.bind(this));
	};

	LocalGenerator.prototype.createManifest = function () {
		return new Promise(function (resolve, reject) {

			fs.write(this.getProjectPath() + '/manifest.yml', yaml.stringify(this.manifest));
			fs.commit(function () {
				resolve();
			});
		}.bind(this));
	};

	LocalGenerator.prototype.getProjectPath = function () {
		return this.root + '/projects/' + this.manifest.name;
	};


	module.exports = LocalGenerator;
})(module);
