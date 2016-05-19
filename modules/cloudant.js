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

(function () {
	var request = require('superagent');

	function Cloudant(database, credentials) {
		this.database = database;
		this.credentials = credentials;
	}

	Cloudant.prototype.dropDatabase = function () {
		return new Promise(function (resolve) {
			request.del(this.credentials.host + '/' + this.database)
				.auth(this.credentials.username, this.credentials.password)
				.end(function () {
					resolve();
				});
		}.bind(this));
	};

	Cloudant.prototype.createDatabase = function () {
		return new Promise(function (resolve, reject) {
			request
				.put(this.credentials.host + '/' + this.database)
				.auth(this.credentials.username, this.credentials.password)
				.end(function (err, res) {
					if (!err && res.statusCode === 201) {
						resolve();
					} else {
						reject('Couldn\'t create new database. [' + res.statusCode + ': ' + res.statusMessage + ']');
					}
				});
		}.bind(this));
	};

	Cloudant.prototype.uploadData = function (data) {
		return new Promise(function (resolve, reject) {
			request
				.post(this.credentials.host + "/" + this.database + "/_bulk_docs")
				.auth(this.credentials.username, this.credentials.password)
				.set('Content-Type', 'application/x-www-form-urlencoded;charset=utf-8')
				.type('json')
				.send(data)
				.end(function (err, res) {
					if (!err && res.statusCode === 201) {
						resolve();
					}
					else {
						reject('Couldn\'t add data to database.');
					}
				});
		}.bind(this));
	};

	module.exports = Cloudant;

})(module);
