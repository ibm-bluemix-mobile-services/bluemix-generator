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

	var _ = require('lodash');

	function OpenWhiskApi(apiClient) {
		this.api = apiClient;
	}

	OpenWhiskApi.prototype.authenticate = function (authTokens) {
		return this.api.authenticate(authTokens).then(function (openWhiskAuth) {
			return this.api.setCredentials(openWhiskAuth.uuid, openWhiskAuth.key);
		}.bind(this));
	};

	OpenWhiskApi.prototype.createAction = function (org, space, actionName, actionType, actionPayload) {

		return this.api.put('/api/v1/namespaces/' + org + '_' + space + '/actions/' + actionName + '?overwrite=true', {
			"exec": {
				"kind": actionType,
				"code": actionPayload
			},
			"publish": true
		}).then(function (response) {
			return Promise.resolve(response.body);
		}).catch(function (error) {
			var message = _.get(error, 'response.error.text');

			return Promise.reject(message ? JSON.parse(message) : error);
		});
	};

	module.exports = OpenWhiskApi;
})(module);
