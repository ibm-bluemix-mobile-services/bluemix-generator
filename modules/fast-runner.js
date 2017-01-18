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
	function FastRunner(jobs) {
		this.jobs = jobs;
	}

	FastRunner.prototype.run = function (worker) {
		var size = this.jobs.length;

		if (size == 0) {
			return Promise.resolve();
		} else if (size == 1) {
			return worker(this.jobs[0]);
		} else {

			var head = this.jobs.shift();

			var deferred = worker(head);

			this.jobs.forEach(function (service) {
				deferred = deferred.then(function () {
					return worker(service);
				})
			});

			return deferred;
		}
	};


	module.exports = FastRunner;
})(module);
