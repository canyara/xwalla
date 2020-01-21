/*    Copyright 2016-2020 Firewalla Inc.
 *
 *    This program is free software: you can redistribute it and/or  modify
 *    it under the terms of the GNU Affero General Public License, version 3,
 *    as published by the Free Software Foundation.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU Affero General Public License for more details.
 *
 *    You should have received a copy of the GNU Affero General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict'

const log = require('../net2/logger.js')(__filename);

const util = require('util');
const minimatch = require("minimatch");

const _ = require('lodash');
const flat = require('flat');

class DeviceGroup {
    // props: {
    //     id: string,
    //     name: string,
    //     createTimestamp: number,
    //     devices: Array<string>
    // }
    constructor(props) {
        if (!props) throw new Error("Empty DeviceGroup props");

        Object.assign(this, props);
        this.devices = [];

        if (props.devices) {
            if (_.isString(props.devices)) {
                try {
                    this.devices = JSON.parse(props.devices);
                } catch (e) {
                    log.error("Failed to parse deviceGroup devices string:", props.devices, e);
                }
            } else if (_.isArray(props.devices)) {
                this.devices = Array.from(props.devices);
            } else {
                log.error("Unsupported devices", props.devices);
            }
        }

        this.createTimestamp = this.createTimestamp || new Date() / 1000;
    }

    // return a new object ready for redis writing
    redisfy() {
        let p = JSON.parse(JSON.stringify(this))

        if (p.devices) {
            if (p.devices.length > 0)
                p.devices = JSON.stringify(p.devices);
            else
                delete p.devices;
        }

        return flat.flatten(p);
    }
}

DeviceGroup.PREFIX = "deviceGroup:";

module.exports = DeviceGroup
