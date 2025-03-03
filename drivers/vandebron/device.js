'use strict';

const { OAuth2Device } = require('homey-oauth2app');

module.exports = class VandebronDevice extends OAuth2Device {

  async onOAuth2Init() {
    this.log('VandebronDevice has been initialized');

    this.homey.flow.getConditionCard('greenest_moment_now')
      .registerRunListener(async (args, state) => {
        return this.getCapabilityValue('alarm_greenest_moment');
      });

    // Initial sync
    await this.syncGreenEnergyPercentage();
    await this.syncGreenestMomentInfo();
    await this.setGreenestMomentCapability();
    await this.setAlarmGreenestMomentCapability();

    // Set intervals
    this.homey.setInterval(async () => {
      // Sync data from the API
      await this.syncGreenestMomentInfo();
      await this.setGreenestMomentCapability();
    }, 60 * 60 * 1000); // every hour

    this.homey.setInterval(async () => {
      // Token validity seems to be flaky, so we refresh it every 10 minutes
      await this.oAuth2Client.refreshToken();
      
      await this.syncGreenEnergyPercentage();
    }, 10 * 60 * 1000); // every 10 minutes

    this.homey.setInterval(async () => {
      await this.setAlarmGreenestMomentCapability();
    }, 10 * 1000); // every 10 seconds
  }

  /*
    Synchronisation methods
  */
  async syncGreenestMomentInfo() {
    let greenestMoment = await this.oAuth2Client.getTodaysGreenestMoment(this.getStoreValue('organizationId'));
    await this.setStoreValue('greenestMoment', greenestMoment);
  }

  async syncGreenEnergyPercentage() {
    let greenEnergyPercentage = Math.round(await this.oAuth2Client.getGreenEnergyPercentage(this.getStoreValue('organizationId')));

    await this.setCapabilityValue('measure_green_energy', greenEnergyPercentage);
    this.homey.api.realtime('measure_green_energy', greenEnergyPercentage);
  }

  /*
    Set capability methods
  */
  async setGreenestMomentCapability() {
    let greenestMoment = this.getStoreValue('greenestMoment');
    let timezone = this.homey.clock.getTimezone();

    function formatToLocalTime(utcDateStr, timezone) {
      let date = new Date(utcDateStr);
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone
      });
    }

    let startTime = formatToLocalTime(greenestMoment.windowStart, timezone);
    let endTime = formatToLocalTime(greenestMoment.windowEnd, timezone);

    await this.setCapabilityValue('greenest_moment', `${startTime} - ${endTime}`);
    this.homey.api.realtime('greenest_moment', `${startTime} - ${endTime}`);
  }

  async setAlarmGreenestMomentCapability() {
    let greenestMoment = this.getStoreValue('greenestMoment');
    let now = new Date();
    let windowStart = new Date(greenestMoment.windowStart);
    let windowEnd = new Date(greenestMoment.windowEnd);

    // only set if the current capability value is different
    if (this.getCapabilityValue('alarm_greenest_moment') === now >= windowStart && now <= windowEnd) {
      return;
    }

    await this.setCapabilityValue('alarm_greenest_moment', now >= windowStart && now <= windowEnd);
    this.homey.api.realtime('alarm_greenest_moment', now >= windowStart && now <= windowEnd);
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('VandebronDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({
    oldSettings,
    newSettings,
    changedKeys
  }) {
    this.log('VandebronDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('VandebronDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onOAuth2Deleted() {
    this.log('VandebronDevice has been deleted');
  }

};
