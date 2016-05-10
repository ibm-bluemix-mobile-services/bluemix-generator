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
	var _ = require('lodash'),
		EventEmitter = require('events');

	var events = new EventEmitter(),
		handlers = {};

	module.exports = {
		fireEvent: function (name, event) {
			return new Promise(function (resolve, reject) {
				if (!events.emit(name, event, resolve, reject)) {
					resolve();
				}
			});
		},
		registerTemplateHandler: function (home, chalk) {
			try {
				var customHandler = require(home + '/generator');
				customHandler({
					events: events,
					text: chalk
				});
			} catch (e) {
			}
		},
		registerHandler: function (service, handler) {
			handlers[service] = handler;
		},
		run: function (service, credentials, progress) {
			if (_.get(handlers, service.type + '.run')) {
				return handlers[service.type].run(service, credentials, progress);
			}

			return Promise.resolve();
		},
		handleFailure: function (service, error, progress) {

			if (_.get(handlers, service.type + '.onError')) {
				return handlers[service.type].onError(service, error, progress);
			}

			return Promise.resolve();
		}
	};
})(module);
