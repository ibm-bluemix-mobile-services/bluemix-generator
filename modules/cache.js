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
	var fs = require('fs'),
		_ = require('lodash');

	function Cache(path) {
		this.path = path;
		this.isPendingInvalidate = false;
	}

	Cache.prototype.create = function() {
		this.exists().catch(function(){
			this.save({});
		}.bind(this));
	};

	Cache.prototype.exists = function () {
		return new Promise(function (resolve, reject) {
			fs.access(this.path, fs.R_OK | fs.W_OK, function (error) {
				if (error) {
					return reject();
				}

				return resolve();
			})
		}.bind(this));
	};

	Cache.prototype.read = function () {
		return this.exists().then(function () {
			return this.load();
		}.bind(this));
	};


	Cache.prototype.load = function () {
		return new Promise(function (resolve, reject) {
			fs.readFile(this.path, 'utf8', function (error, data) {
				if (error) {
					return reject();
				} else if (data.trim().length === 0) {
					return reject();
				}

				try {
					resolve(JSON.parse(data));
				} catch (e) {
					reject(e);
				}

			});
		}.bind(this));
	};

	Cache.prototype.save = function (config) {
		return new Promise(function (resolve, reject) {

			fs.writeFile(this.path, JSON.stringify(config), function (err) {
				if (err) {
					return reject(err);
				}

				resolve(config);
			});
		}.bind(this));
	};

	Cache.prototype.invalidate = function () {
		return this.save({});
	};

	Cache.prototype.setPendingInvalidate = function (invalidate) {
		this.isPendingInvalidate = invalidate;
	};

	Cache.prototype.invalidateIfPending = function () {
		if (this.isPendingInvalidate) {
			return this.invalidate();
		}

		return Promise.resolve();
	};

	module.exports = Cache;
})(module);
