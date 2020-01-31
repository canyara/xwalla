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

'use strict';
const log = require('../net2/logger.js')(__filename);

const util = require('util');
const _ = require('lodash');

const rclient = require('../util/redis_manager.js').getRedisClient();
const sclient = require('../util/redis_manager.js').getSubscriptionClient();
const pclient = require('../util/redis_manager.js').getPublishClient();
const DeviceGroup = require('./DeviceGroup');

const exec = require('child-process-promise').exec

const deviceGroupIDKey = "device:group:id";

class DeviceGroupManager {
    constructor(main = false) {
        log.info('Initializing DeviceGroupManager')
        this.update();
        this.ts = Date.now() / 1000;
        this.deviceGroups = {};

        log.info("Init", this.ts);
        sclient.on("message", (channel, message) => {
            log.info("Msg", this.ts, channel, message);
            switch (channel) {
                case "DeviceGroup:Update":
                    this.update();
                    break;
                default:
                    break;
            }
        });

        sclient.subscribe("DeviceGroup:Update");
        return self;
    }

    async update() {
        const keys = await rclient.keysAsync(DeviceGroupManager.groupPrefx + '*');
        if (keys) {
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                let deviceGroup = await rclient.hgetallAsync(key);
                deviceGroups.push(deviceGroup);
            }
        }
    }

    async getNextID() {
        try {
            let reuslt = await rclient.getAsync(deviceGroupIDKey);
            if (result) {
                return await rclient.incrAsync(deviceGroupIDKey);
            } else {
                await rclient.setAsync(deviceGroupIDKey, 1);
                return await rclient.incrAsync(deviceGroupIDKey);
            }
        } catch (error) {
            log.error("Failed getNextID: " + err);
            throw error;
        }
    }

    // name: string, devices: Array<string>
    async addDeviceGroup(name, devices = []) {
        try {
            log.info(`addDeviceGroup name:${name}`);
            let id = await this.getNextID();
            let deviceGroup = new DeviceGroup({ name, id, devices });
        } catch (error) {
            log.error("Failed addDeviceGroup: " + err);
            throw error;
        }
    }

    async delDeviceGroup(id) {
        try {
            log.info(`delDeviceGroup:`, id);

            let deviceGroupKey = DeviceGroup.PREFIX + id;

            //@TODO update policy
            await rclient.delAsync(deviceGroupKey);
            await pclient.publishAsync("DeviceGroup:Update", "");
        } catch (error) {
            log.error("Failed delDeviceGroup: " + err);
            throw error;
        }
    }

    async getAllDeviceGroup() {
        try {
            let deviceGroups = [];
            let deviceGroupsKeys = await rclient.keysAsync(DeviceGroup.PREFIX + '*');
            if (deviceGroupsKeys && deviceGroupsKeys.length > 0) {
                let multi = rclient.multi();
                for (let index = 0; index < deviceGroupsKeys.length; index++) {
                    const dgKey = deviceGroupsKeys[index];
                    multi.hgetall(dgKey);
                }

                let result = await multi.execAsync();
                for (let index = 0; index < result.length; index++) {
                    const deviceGroup = result[index];
                    if (deviceGroup) {
                        let dg = new DeviceGroup(deviceGroup);
                        deviceGroups.push(dg);
                    }
                }

            }

            return deviceGroups;
        } catch (error) {
            log.error("Failed getAllDeviceGroup: " + err);
            throw error;
        }
    }

    async addDeviceToDeviceGroup(deviceGroupId, devices) {
        try {
            log.info(`delDeviceGroup:`, deviceGroupId, devices);

            let deviceGroupKey = DeviceGroup.PREFIX + deviceGroupId;

            await rclient.delAsync(deviceGroupKey);
            await pclient.publishAsync("DeviceGroup:Update", "");
            //@TODO update policy
        } catch (error) {
            log.error("Failed delDeviceGroup: " + err);
            throw error;
        }
    }

    async saveDeviceGroup(deviceGroup) {
        try {
            log.info(`saveDeviceGroup:`, deviceGroup);
            if (_.isEmpty(deviceGroup.id)) {
                let deviceGroup.id = await this.getNextID();
            }

            deviceGroup.id = id + "";

            let deviceGroupKey = DeviceGroup.PREFIX + id;

            await rclient.hmsetAsync(deviceGroupKey, deviceGroup.redisfy());
            await pclient.publishAsync("DeviceGroup:Update", "");
            //@TODO update policy
        } catch (error) {
            log.error("Failed saveDeviceGroup: " + err);
            throw error;
        }
    }



};

DeviceGroupManager.groupPrefx = 'device:group:';

let _groupManager = new DeviceGroupManager();
module.exports = _groupManager; 