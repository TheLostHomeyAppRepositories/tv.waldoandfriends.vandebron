const jwt = require('jsonwebtoken');
const {
  OAuth2Client,
  OAuth2Error,
  OAuth2Token
} = require('homey-oauth2app');

module.exports = class VandebronClient extends OAuth2Client {

  // Required:
  static API_URL = 'https://mijn.vandebron.nl/api/v1';
  static TOKEN_URL = 'https://vandebron.nl/auth/realms/vandebron/protocol/openid-connect/token';
  static AUTHORIZATION_URL = '';
  static SCOPES = ['profile', 'email'];
  static TOKEN = OAuth2Token;

  async onHandleNotOK({ body }) {
    throw new OAuth2Error(body.error);
  }

  async getUserId() {
    if (!this._token || !this._token.access_token) {
      throw new Error('No access token available');
    }

    const decodedToken = jwt.decode(this._token.access_token);
    if (!decodedToken) {
      throw new Error('Failed to decode access token');
    }

    return decodedToken.preferred_username;
  }

  async getUserOrganizationId(userId) {
    let response = await this.get({
      path: `/customers/${userId}/productGroups`,
    });

    if (
      !response ||
      !response.productGroups ||
      !response.productGroups[0] ||
      !response.productGroups[0].resources ||
      !response.productGroups[0].resources[0]
    ) {
      throw new Error('Could not extract organizationId');
    }

    return response.productGroups[0].resources[0].organizationId;
  }

  async getTodaysGreenestMoment(organizationId) {
    return await this.get({
      path: `/energyConsumers/${organizationId}/greenEnergyMix/window`,
      query: {
        forecastDate: new Date().toISOString()
          .split('T')[0],
        windowSize: '3H'
      }
    });
  }

  async getGreenEnergyPercentage(organizationId) {
    let response = await this.get({
      path: `/energyConsumers/${organizationId}/greenEnergyMix/forecast`,
      query: {
        forecastDate: new Date().toISOString()
          .split('T')[0]
      }
    });

    const data = response.data;
    const currentTime = Date.now();

    let closestEntry = data.reduce((closest, entry) => {
      const entryTime = new Date(entry.time).getTime();
      const closestTime = new Date(closest.time).getTime();

      return Math.abs(entryTime - currentTime) < Math.abs(closestTime - currentTime) ? entry : closest;
    });

    return closestEntry.greenPercentage;
  }
};
