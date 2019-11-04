/***********************************************************
*
* MODULE: 		authentication.js
*
* PROJECT: 		appTestAPI
*
* DESCRIPTION:	OAuth authentication code for Onshape

* 				Based on app-stl-viewer/authentication.js
*
***********************************************************/
//
// Definitions ..
//
var request = require('request-promise');
var dateUtils = require('date-utils');
var passport = require('passport');
var OnshapeStrategy = require('passport-onshape').Strategy;

// Hardwired rather than ENV
var oauthClientId = 'LQ4HO6M3XL2UWDAQPDAPDN2O7O2MQBTXDY27QNA=';
var oauthClientSecret = 'RABZKDUU3IOSE6VZXNPPXPNIXNUNZ4NWGQ4U5XB4QQSGATDGDXYA====';
var callbackUrl = 'https://murmuring-temple-07496.herokuapp.com/oauthRedirect';
var oauthUrl = 'https://oauth.onshape.com';
var apiUrl = 'https://cad.onshape.com';

/*
// Set OAuth process variables
//
if (process.env.OAUTH_CLIENT_ID) {
  oauthClientId = process.env.OAUTH_CLIENT_ID;
}
if (process.env.OAUTH_CLIENT_SECRET) {
  oauthClientSecret = process.env.OAUTH_CLIENT_SECRET;
}
if (process.env.OAUTH_URL) {
  oauthUrl = process.env.OAUTH_URL;
}
if (process.env.API_URL) {
  apiUrl = process.env.API_URL;
}
if (process.env.OAUTH_CALLBACK_URL) {
  callbackUrl = process.env.OAUTH_CALLBACK_URL;
}

*/

//
//  Initialise OnShape authentication
//
function init() {
  passport.serializeUser(function(user, done) {
    done(null, user);
  });
  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });

  passport.use(new OnshapeStrategy({
      clientID: oauthClientId,
      clientSecret: oauthClientSecret,
      callbackURL: callbackUrl,
      authorizationURL: oauthUrl + "/oauth/authorize",
      tokenURL: oauthUrl + "/oauth/token",
      userProfileURL: apiUrl + "/api/users/sessioninfo"
    },
    function(accessToken, refreshToken, profile, done) {
      // asynchronous verification, for effect...
      process.nextTick(function () {

        profile.accessToken = accessToken;
        profile.refreshToken = refreshToken;

        // To keep the example simple, the user's Onshape profile is returned to
        // represent the logged-in user.  In a typical application, you would want
        // to associate the Onshape account with a user record in your database,
        // and return that user instead.
        return done(null, profile);
      });
    }
  ));
}

//
// When OAuth token is received
//
function onOAuthTokenReceived(body, req) {
  var jsonResponse;
  jsonResponse = JSON.parse(body);
  if (jsonResponse) {
    req.user.accessToken = jsonResponse.access_token;
    req.user.refreshToken = jsonResponse.refresh_token;
  }
}
var pendingTokenRefreshes = {};

//
// Refresh the OAuth token
//
function refreshOAuthToken(req, res, next) {

  if (pendingTokenRefreshes[req.session.id]) {
    return pendingTokenRefreshes[req.session.id]
  }
  var refreshToken = req.user.refreshToken;

  if (refreshToken) {
    pendingTokenRefreshes[req.session.id] = request.post({
      uri: oauthUrl + '/oauth/token',
      form: {
        'client_id': oauthClientId,
        'client_secret': oauthClientSecret,
        'grant_type': 'refresh_token',
        'refresh_token': refreshToken
      }
    }).then(function(body) {
      delete pendingTokenRefreshes[req.session.id];
      return onOAuthTokenReceived(body, req);
    }).catch(function(error) {
      delete pendingTokenRefreshes[req.session.id];
      console.log('Error refreshing OAuth Token: ', error);
      res.status(401).send({
        authUri: getAuthUri(),
        msg: 'Authentication required.'
      });
      throw(error);
    });
    return pendingTokenRefreshes[req.session.id];
  } else {
    return Promise.reject('No refresh_token');
  }
}

//
// Get the OAuth URI
//
function getAuthUri() {
  return oauthUrl + '/oauth/authorize?response_type=code&client_id=' + oauthClientId;
}

//
// Export the module
//
module.exports = {
  'init': init,
  'refreshOAuthToken': refreshOAuthToken,
  'getAuthUri': getAuthUri
};
