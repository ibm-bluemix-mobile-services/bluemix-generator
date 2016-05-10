/*
 Copyright 2016 IBM Corp.
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
        http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

(function (module) {

	var _ = require("lodash"),
		request = require('superagent'),
		BluemixApiClient = require('./bluemix-api-client.js'),
		BluemixServiceApi = require('./bluemix-service-api.js');


	module.exports = function (config) {

		if (!_.has(config, 'url')) {
			throw  {msg: 'missing `url` object'};
		} else if (!_.has(config.url, 'auth')) {
			throw {msg: 'missing `url.auth` key'};
		} else if (!_.has(config.url, 'api')) {
			throw {msg: 'missing `url.api` key'};
		} else if (!_.has(config, 'host')) {
			throw {msg: 'missing `host` key'};
		}

		var app = {
			api: null,
			client: new BluemixApiClient(config.url.api)
		};

		return {
			exist: function (name) {
				return new Promise(function (resolve) {
					request.get("http://" + name + "." + config.host).end(function (err, res) {
						if (!err && res.statusCode === 200) {
							return resolve(false);
						}
						resolve(name);
					});
				});
			},
			login: function (username, password) {
				return new Promise(function (resolve) {
					request
						.post(config.url.auth + '/UAALoginServerWAR/oauth/token')
						.send('grant_type=password&username=' + username + '&password=' + password)
						.set('Content-Type', 'application/x-www-form-urlencoded;charset=utf-8')
						.set('accept', 'application/json;charset=utf-8')
						.set('authorization', 'Basic Y2Y6')
						.end(function (err, res) {
							if (!err && res.statusCode === 200) {
								//noinspection JSUnresolvedVariable
								app.client.setOAuthToken(res.body.access_token);

								resolve(password);
							}
							else {
								resolve(false);
							}
						}.bind(this));
				}.bind(this));
			},

			api: function () {
				if (app.api === null) {
					if (app.client.token === null) {
						throw {msg: 'OAuth token is null. Login to obtain a token.'};
					}

					app.api = new BluemixServiceApi(app.client);
				}

				return app.api;
			}
		};
	};
})(module);
