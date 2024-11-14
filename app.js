'use strict';

const { OAuth2App } = require('homey-oauth2app');
const VandebronClient = require('./lib/VandebronClient');

module.exports = class VandebronApp extends OAuth2App {

  static OAUTH2_CLIENT = VandebronClient;
  static OAUTH2_DEBUG = true;
  static OAUTH2_MULTI_SESSION = false;

  /**
   * onInit is called when the app is initialized.
   */
  async onOAuth2Init() {
    this.log('VandebronApp has been initialized');
  }

};
