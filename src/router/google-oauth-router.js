import { Router } from 'express';
import superagent from 'superagent';
import HttpErrors from 'http-errors';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import Account from '../model/account';
import logger from '../lib/logger';

require('dotenv').config();

const GOOGLE_OAUTH_URL = 'https://www.googleapis.com/oauth2/v4/token';
const OPEN_ID_URL = 'https://www.googleapis.com/plus/v1/people/me/openIdConnect';

const googleOAuthRouter = new Router();
// clicking on the google button, it is going to ask for consent to use a google accnt to sign in; we are looking to get a code from google
googleOAuthRouter.get('/api/oauth/google', (request, response, next) => {
  return Account.init()
    .then(() => {
      // I will already have a request.query.code attached to the request object from Google at this point
      if (!request.query.code) {
        logger.log(logger.ERROR, 'DID NOT GET CODE FROM GOOGLE');
        response.redirect(process.env.CLIENT_URL);
        return next(new HttpErrors(500, 'Google OAuth Error'));
      }
      logger.log(logger.INFO, `RECEIVED A CODE FROM GOOGLE, SENDING IT BACK: ${request.query.code}`);

      // Once we have the Google code, we send it back to Google' server that deals with making tokens
      let accessToken;
      return superagent.post(GOOGLE_OAUTH_URL)
        .type('form')
        .send({
          code: request.query.code,
          grant_type: 'authorization_code',
          client_id: process.env.GOOGLE_OAUTH_ID,
          client_secret: process.env.GOOGLE_OAUTH_SECRET,
          redirect_uri: `${process.env.API_URL}/oauth/google`,
        })
      // if we successfully send object above with the properties needed, we will get a token from google
      
        .then((googleTokenResponse) => {
          if (!googleTokenResponse.body.access_token) {
            logger.log(logger.ERROR, 'No Token from Google');
            return response.redirect(process.env.CLIENT_URL);
          }
          logger.log(logger.INFO, `RECEIVED GOOGLE ACCESS TOKEN: ${JSON.stringify(googleTokenResponse.body, null, 2)}`);
          accessToken = googleTokenResponse.body.access_token;
          // now that we have google toke, we make another get request (with differnet URL)
          logger.log(logger.INFO, `ACCESS TOKEN RECEIVED: ${JSON.stringify(accessToken)}`);
          return superagent.get(OPEN_ID_URL)
            .set('Authorization', `Bearer ${accessToken}`);
        })
      // if we get to this point, google will send back account info of the user (openIDResponse )
        
        .then((openIDResponse) => {
          logger.log(logger.INFO, `OPEN ID: ${JSON.stringify(openIDResponse.body, null, 2)}`);
          // take email from account info
          const { email } = openIDResponse.body;
          // check to see if that account exists in database
          return Account.findOne({ email })
            .then((foundAccount) => {
              // if I don't have an account, we will create a new one in the db
              if (!foundAccount) {
                const username = email; 
                // crypto creates fake password for account
                const secret = `${crypto.randomBytes(25)}${process.env.SECRET_KEY}`;
                return Account.create(username, email, secret)
                  .then((account) => {
                    console.log(account); 
                    // assign the google token we just got to the tokenseed of our account and save it
                    account.tokenSeed = accessToken;
                    return account.save();
                  })
                  .then((updatedAccount) => {
                    console.log(updatedAccount, 'UPDATED ACCOUNT');
                    // take tokenseed from the account and encrypt it to send to the client; updatedAccount = google access token we got earlier
                    return jwt.sign({ tokenSeed: updatedAccount.tokenSeed }, process.env.SECRET_KEY);
                  })
                  .then((signedToken) => {
                    const cookieOptions = { maxAge: 7 * 1000 * 60 * 60 * 24 };
                    response.cookie('X-401d25-Token', signedToken, cookieOptions);
                    response.redirect(process.env.CLIENT_URL);
                  })
                  .catch(next);
                } else { // eslint-disable-line
                return jwt.sign({ tokenSeed: foundAccount.tokenSeed }, process.env.SECRET_KEY);
              }
            })
            .then((token) => {
              const cookieOptions = { maxAge: 7 * 1000 * 60 * 60 * 24 };
              response.cookie('X-401d25-Token', token, cookieOptions);
              return response.redirect(process.env.CLIENT_URL); 
            })
            .catch(next);
        })
        .catch(next);
    })
    .catch(next);
});

//       Account.init()
//         .then(() => {
//           Account.find({ email })
//             .then((accounts) => {
//               const account = accounts[0];
              
              
//               }
//             });
//         });

//     })
//     .catch(next);
// });

export default googleOAuthRouter;
