![Capital.com logo](https://capital.com/img/logo.svg)

- General information
- Getting started
- Available functionality
- Examples and collections
- Changelog
- Authentication
  - How to start new session?
  - After starting the session
- Symbology
- Orders and positions
- FAQ
  - Which kind of APIs do you have?
  - Do you have any limitations on your API?
  - Does your API support all the instruments?
  - How to start using Capital.com API?
  - Can I use Capital.com API on the Demo account?
  - How to generate an API key?
  - Which kind of API Key privileges can I have?
  - What does a Custom password field mean during the API key generation process?
  - How can I pause or launch an API key?
  - How can I view more information about the API key?
  - I don't see my API Key. What could have happened?
  - I see "\*\*\*\*" instead of my API Key. How can I find a full API Key information?
- WebSocket API
  - Subscribe to market data
  - Unsubscribe from market data
  - Subscribe to OHLC market data
  - Unsubscribe from OHLC market data
  - Ping the service
- REST API
- General
  - getGet server time
  - getPing the service
- Session
  - getEncryption key
  - getSession details
  - postCreate new session
  - putSwitches active account
  - delLog out of the current session
- Accounts
  - getAll accounts
  - getAccount preferences
  - putUpdate account preferences
  - getAccount activity history
  - getAccount transactions history
  - postAdjust balance of Demo account
- Trading
  - getPosition/Order confirmation
- Trading > Рositions
  - getAll positions
  - postCreate position
  - getSingle position
  - putUpdate position
  - delClose position
- Trading > Orders
  - getAll working orders
  - postCreate working order
  - putUpdate working order
  - delDelete working order
- Markets Info > Markets
  - getAll top-level market categories
  - getAll category sub-nodes
  - getMarkets details
  - getSingle market details
- Markets Info > Prices
  - getHistorical prices
- Markets Info > Client Sentiment
  - getClient sentiment for markets
  - getClient sentiment for market
- Watchlists
  - getAll watchlists
  - postCreate watchlist
  - getSingle watchlist
  - putAdd market to watchlist
  - delDelete watchlist
  - delRemove market from watchlist

[API docs by Redocly](https://redocly.com/redoc/)

# Capital.com Public API(1.0.0)

The Capital.com API allows direct access to the latest version of our trading engine.

# [section/General-information](https://open-api.capital.com/\#section/General-information) General information

- Base URL: [https://api-capital.backend-capital.com/](https://api-capital.backend-capital.com/)
- Base demo URL: [https://demo-api-capital.backend-capital.com/](https://demo-api-capital.backend-capital.com/)
- In order to use the endpoints a session should be launched. This can be done using the `POST ​​/session` endpoint.
- Session is active for 10 minutes. In case your inactivity is longer than this period then an error will occur upon next request.
- The API covers the full range of available instruments, licences and trading functionality.

# [section/Getting-started](https://open-api.capital.com/\#section/Getting-started) Getting started

To use the API the following simple steps should be taken:

- [**Create a trading account**](http://capital.com/trading/signup)

Note that a demo account can be used.
- **Turn on Two-Factor Authentication (2FA)**

2FA should be turned on prior to API key generation. [Instruction for 2FA enabling](https://capital.zendesk.com/hc/en-us/articles/4403995863314-How-can-I-enable-2FA-).
- **Generate an API key**

To generate the API key, go to Settings > API integrations > Generate new key. There you will need to enter the label of the key, set the custom password for it and an optional expiration date, enter the 2FA code and that’s it.
- **You are all set!**

# [section/Available-functionality](https://open-api.capital.com/\#section/Available-functionality) Available functionality

#### Market data

- Receive real-time prices for the whole range of available assets with the REST and WebSocket API.
- Get the price history for the whole range of assets.

#### Trading functionality

- Open positions, set stop and limit orders, set stop loss and take profit levels.
- Review and change financial account settings (trading modes, leverage sizes).
- Review trades and orders history.

# [section/Examples-and-collections](https://open-api.capital.com/\#section/Examples-and-collections) Examples and collections

- Postman collection: [https://github.com/capital-com-sv/capital-api-postman](https://github.com/capital-com-sv/capital-api-postman)
- Trading bot based on the RSI indicator values: [https://github.com/capital-com-sv/api-java-samples](https://github.com/capital-com-sv/api-java-samples)

# [section/Changelog](https://open-api.capital.com/\#section/Changelog) Changelog

#### **November 28, 2023**

- Added an opportunity to adjust the balance of the Demo account using the `POST /accounts/topUp` endpoint

#### **October 05, 2023**

- Limit of 1 request per second is set for the `POST /session` endpoint.

#### **August 04, 2023**

- Added an opportunity to view the whole list of available markets using the `GET /markets` endpoint

#### **July 04, 2023**

- Set maximum date range for parameters `from`, `to`, `lastPeriod` to 1 day for the `GET /history/activity`

#### **March 23, 2022**

- Limit of 1000 requests per hour is set for the `POST /positions` and `POST /workingorders` in Demo.

#### **March 16, 2022**

- WebSocket API endpoints added to Swagger documentation.

#### **February 10, 2022**

- Release of the first version of the REST and WebSocket API.

# [section/Authentication](https://open-api.capital.com/\#section/Authentication) Authentication

## [section/Authentication/How-to-start-new-session](https://open-api.capital.com/\#section/Authentication/How-to-start-new-session) How to start new session?

There are 2 ways to start the session:

- Using your API key, login and password details.
- Using your API key, login and encrypted password details.

#### Using your API key, login and password details

Here you should simply use the `POST /session` endpoint and mention the received in the platform’s Settings API key in the `X-CAP-API-KEY` header, login and API key password info in the `identifier` and `password` parameters. The value of the `encryptedPassword` parameter should be `false`.

#### Using your API key, login and encrypted password details

- First of all you should use the `GET ​/session​/encryptionKey` and mention the generated in the platform’s Settings API key in the `X-CAP-API-KEY` header. As a response you will receive the `encryptionKey` and `timeStamp` parameters;
- Using the received `encryptionKey` and `timeStamp` parameters you should encrypt your API key password using the AES encryption method.

**Encryption request example**:

```java
public static String encryptPassword(String encryptionKey, Long timestamp, String password) {
    try {
        byte[] input = stringToBytes(password + "|" + timestamp);
        input = Base64.encodeBase64(input);
        KeyFactory keyFactory = KeyFactory.getInstance(RSA_ALGORITHM);
        PublicKey publicKey = keyFactory.generatePublic(new X509EncodedKeySpec(Base64.decodeBase64(stringToBytes(encryptionKey))));
        Cipher cipher = Cipher.getInstance(PKCS1_PADDING_TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, publicKey);
        byte[] output = cipher.doFinal(input);
        output = Base64.encodeBase64(output);
        return bytesToString(output);
    } catch (Exception e) {
        throw new RuntimeException(e);
    }
}

```

Encrypted password example:

```java
encryptionKey = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1dOujgcFh/9n4JLJMY4VMWZ7aRrynwKXUC9RuoC8Qu5UOeskxgZ1q5DmAXjkes77KrLfFZYEKtrp2g1TB0MBkSALiyrG+Fl52vhET9/AWRhvHuFyskWI7tEtcGIaOB1FwR0EDO9bnylTaZ+Y9sPbLVA7loAtfaX3HW/TI9JDpdmgzXZ0KrwIxdMRzPxVqQXcA8yJL1m33pvo9mOJ0AsQ8FFuy+ctjI8l/8xUhe2Hk01rpMBXDwI1lSjnvuUUDvAtacxyYVlNsnRvbrMZYp7hyimm27RtvCUXhTX2A94tDB0MFLApURrki+tvTvw5ImDPN8qOdTUzbs8hNtVwTpSxPwIDAQAB";
timestamp = 1647440528194;
password = "1111qqqq";
// Result of password encryption with the encryptionKey
encryptedPassword = "hUxWlqKRhH6thdjJnR7DvdlGE7ABkcKHrzKDGeE7kQ7nKg91sw7BpYsLDqtxihnlHN2IEmFPZ/ZmOKBAwEAw9/vjELmAZDeKsu3Q6s+Koj4wt8giE1Sxv76JjjOB/667dEeL22IFO1rwTMZ1NS5DrfeYbTfOdQgA0v5eIOS3fH8Pp/mFHodibY28X+zIaNwk6Rcb49l6aiXwM1CAtDl359qK633a+sEB9TR0/C3EaRkuGg8wAQyQ0JERaSYOZ58Dx7pw//cmvk/U5dkQlgli2l6Ts2cMhqYXCD1ZlTDA/rLfl52lgnarfari3n0uh6LicmNeWXJBF5oxj3LCruVwMA==";

```

- Go to the `POST ​/session` endpoint, set `true` value for the `encryptedPassword` parameter and mention the received in the platform’s Settings API key in the `X-CAP-API-KEY` header, login and prior **encrypted** API key password info in the `identifier` and `password` parameters

## [section/Authentication/After-starting-the-session](https://open-api.capital.com/\#section/Authentication/After-starting-the-session) After starting the session

On starting the session you will receive the `CST` and `X-SECURITY-TOKEN` parameters in the response headers. `CST` is an authorization token, `X-SECURITY-TOKEN` shows which financial account is used for the trades. These headers should be passed on subsequent requests to the API. Both tokens are valid for 10 minutes after the last use.

# [section/Symbology](https://open-api.capital.com/\#section/Symbology) Symbology

- **Financial accounts**

accountId is the ID of your financial account. Each financial account has its unique ID. To view the full list of the available financial accounts, use the `GET ​​/accounts` endpoint. To find out which financial account is used for trading operations in the API please go to the `GET ​/session` endpoint. To change the financial account use: `PUT ​/session`.
- **Epic**

Epic is the name of the market pair. You can use the `GET /markets{?searchTerm}` endpoint to find the market pairs you are interested in. A simple market name like ‘Bitcoin’ or ‘BTC’ can be requested with the `searchTerm` parameter and you will receive the full list of the market pairs associated with it. The `GET ​/marketnavigation` endpoint can be used to obtain asset group names. These names can be used with the `GET ​​/marketnavigation​/{nodeId}` endpoint to view the list of assets under the corresponding group.
- **Watchlists**

The Watchlist is the list of assets which can be seen and created on the platform. The `GET /watchlists` endpoint returns the existing watchlists on your account. Each watchlist has an id parameter which can be used to obtain the corresponding list of assets: `GET ​/watchlists​/{watchlistId}`

# [section/Orders-and-positions](https://open-api.capital.com/\#section/Orders-and-positions) Orders and positions

- When opening a position using the `POST /positions` endpoint a `dealReference` parameter is included in the response. However, a successful response does not always mean that the position has been successfully opened. The status of the position can be confirmed using `GET ​/confirms​/{dealReference}`. This will produce the status of the position together with the `affectedDeals` array. Note that several positions can be opened at a time: this info will be shown in the `affectedDeals` array.
- It is important to ensure that the correct trading mode is in use with the API. To find out which trading mode is set on your financial account use the `GET ​/accounts​/preferences` method. The `hedgingMode` parameter value shows whether the hedging mode is engaged. This value can be altered using endpoint: `PUT ​/accounts​/preferences`.
- The leverages set for trades can be obtained using the `GET ​​/accounts​/preferences` endpoint. To change leverages, use `PUT ​​/accounts​/preferences`.
- Note: Stop loss and take profit values cannot be set when conducting trades with real stocks.

# [section/FAQ](https://open-api.capital.com/\#section/FAQ) FAQ

## [section/FAQ/Which-kind-of-APIs-do-you-have](https://open-api.capital.com/\#section/FAQ/Which-kind-of-APIs-do-you-have) Which kind of APIs do you have?

On Capital.com we suggest both REST and WebSocket API. In case of WebSocket API real-time prices updates for max 40 instruments at a time.

## [section/FAQ/Do-you-have-any-limitations-on-your-API](https://open-api.capital.com/\#section/FAQ/Do-you-have-any-limitations-on-your-API) Do you have any limitations on your API?

Yes, we do have several limitations in our Capital.com API. Here is the list:

- You have max **100 attempts per 24hrs** to successfully generate API keys.
- The maximum request rate is **10 per second** per user.
- The maximum request rate is **1 per 0.1 seconds** per user when opening positions or creating orders. Otherwise the position/order requests are going to be rejected.
- WebSocket session duration is **10 minutes**. In order to keep the session live use the ping endpoint.
- REST session is also active for **10 minutes**. In case your inactivity is longer than this period then an error will occur upon next request.
- `POST /session` endpoint limit is **1 request per second** per API key.
- `POST /positions` and `POST /workingorders` endpoint limit is **1000 requests per hour** in the Demo account.
- `POST /accounts/topUp` endpoint limits: **10 requests per second** and **100 requests per account per day**.
- The balance of the Demo account cannot exceed 100000.
- The WebSocket API allows subscription to a maximum of **40 instruments**.
- WebSocket streaming falls off when the financial account is changed with the help of the `PUT​ /session` endpoint.

## [section/FAQ/Does-your-API-support-all-the-instruments](https://open-api.capital.com/\#section/FAQ/Does-your-API-support-all-the-instruments) Does your API support all the instruments?

Yes, Capital.com API supports all of the instruments which you can find on the platform.

## [section/FAQ/How-to-start-using-Capital.com-API](https://open-api.capital.com/\#section/FAQ/How-to-start-using-Capital.com-API) How to start using Capital.com API?

In order to start using our Capital.com API you should first of all generate an API key in the `Settings` \> `API integrations` section on the platform. Upon doing so you will be able to use this key and your account credentials to authorise for the API usage with the `POST /session` method.

## [section/FAQ/Can-I-use-Capital.com-API-on-the-Demo-account](https://open-api.capital.com/\#section/FAQ/Can-I-use-Capital.com-API-on-the-Demo-account) Can I use Capital.com API on the Demo account?

Sure. In order to use your Demo account with our API you should mention the following service as Base URL: [https://demo-api-capital.backend-capital.com/](https://demo-api-capital.backend-capital.com/)

## [section/FAQ/How-to-generate-an-API-key](https://open-api.capital.com/\#section/FAQ/How-to-generate-an-API-key) How to generate an API key?

In order to generate an API Key you should log in to your account, go to the `Settings` \> `API integrations` section and click on the `Generate API key` button.

In case your 2FA is turned off you will be asked to switch on this function to ensure safe and secure keys usage.

Next you will be presented with the `Generate new key` window where you will be able to name your API Key, add an API key password and set an expiration date (if needed). By default the validity of the API key is 1 year.

After that you should enter your 2FA code and wait for an API Key to be generated. Once an API Key is generated you will see an API Key itself. Please, make sure to save this data as it is shown only once.

Congratulations. You should have successfully managed to integrate our API functionality. In case you have any questions - feel free to contact us ( [support@capital.com](mailto:support@capital.com)). We will be glad to help you.

## [section/FAQ/Which-kind-of-API-Key-privileges-can-I-have](https://open-api.capital.com/\#section/FAQ/Which-kind-of-API-Key-privileges-can-I-have) Which kind of API Key privileges can I have?

Currently we have only 1 type of the API Keys privileges which allows trading. No Read Only API Keys can be generated.

## [section/FAQ/What-does-a-Custom-password-field-mean-during-the-API-key-generation-process](https://open-api.capital.com/\#section/FAQ/What-does-a-Custom-password-field-mean-during-the-API-key-generation-process) What does a Custom password field mean during the API key generation process?

A `Custom password` field allows you to generate a separate password for your API key. You should use this `Custom password` for the API key in order to start the session.

## [section/FAQ/How-can-I-pause-or-launch-an-API-key](https://open-api.capital.com/\#section/FAQ/How-can-I-pause-or-launch-an-API-key) How can I pause or launch an API key?

In order to pause or launch an API key you can click on the `Pause` or `Play` icons next to the API key in the `Settings` \> `API integrations` section. This functionality allows you to either disable or enable a key when you need to do it without deleting a key itself and re-generating a new one.

## [section/FAQ/How-can-I-view-more-information-about-the-API-key](https://open-api.capital.com/\#section/FAQ/How-can-I-view-more-information-about-the-API-key) How can I view more information about the API key?

In order to view more information about the API key you have generated please click on an `Eye` icon next to the key in the `Settings` \> `API integrations` section.

## [section/FAQ/I-don't-see-my-API-Key.-What-could-have-happened](https://open-api.capital.com/\#section/FAQ/I-don't-see-my-API-Key.-What-could-have-happened) I don't see my API Key. What could have happened?

There are 2 reasons for your API Key to be deleted:

- your account status has changed to either `SUSPENDED` or `BLOCKED`;
- your API Key has reached an expiration date.

In all other cases your API Keys should work as expected.

## [section/FAQ/I-see-"****"-instead-of-my-API-Key.-How-can-I-find-a-full-API-Key-information](https://open-api.capital.com/\#section/FAQ/I-see-%22****%22-instead-of-my-API-Key.-How-can-I-find-a-full-API-Key-information) I see "\*\*\*\*" instead of my API Key. How can I find a full API Key information?

According to the existing procedure the only moment you can see your API Key is during its creation. After that it will always be masked.

In case you have lost your API Key or didn't record it, you will have to create a new one and make sure that you store a new key in a secure place.

# [section/WebSocket-API](https://open-api.capital.com/\#section/WebSocket-API) WebSocket API

In order to start using WebSocket connect to `wss://api-streaming-capital.backend-capital.com/connect`.

In order to keep the connection alive, ping service at least once every 10 minutes.

More information regarding the WebSocket API requests and responses parameters can be found in the table below:

| **Parameter** | **Description** |
| --- | --- |
| destination | The subscription destination which performs as an analogue for the request endpoint in the REST API model. |
| correlationId | Is set to understand for which request the message was received. Helps to track the correlation between the subscription destination and response. |
| cst | Access token identifying the client. Can be received upon starting the session. <br>Is equal to `CST` parameter. |
| securityToken | Account token or account id identifying the client's current account. Can be received upon starting the session. <br>Is equal to `X-SECURITY-TOKEN` parameter. |
| payload | An object which contains the data regarding the corresponding markets. |

## [section/WebSocket-API/Subscribe-to-market-data](https://open-api.capital.com/\#section/WebSocket-API/Subscribe-to-market-data) Subscribe to market data

**Destination:** `marketData.subscribe`

Subscribe to the price updates by mentioning the epics

The maximum number of epics: 40

**Request message example:**

```java
{
    "destination": "marketData.subscribe",
    "correlationId": "1",
    "cst": "zvkT26****nsHKk",
    "securityToken": "g6K90****QKvCS7",
    "payload": {
        "epics": [\
            "OIL_CRUDE"\
        ]
    }
}

```

**Example of the response message about successful subscription:**

```java
{
    "status": "OK",
    "destination": "marketData.subscribe",
    "correlationId": "1",
    "payload": {
        "subscriptions": {
            "OIL_CRUDE": "PROCESSED"
        }
    }
}

```

**Example of the response message with market data updates:**

```java
{
    "status": "OK",
    "destination": "quote",
    "payload": {
        "epic": "OIL_CRUDE",
        "product": "CFD",
        "bid": 93.87,
        "bidQty": 4976.0,
        "ofr": 93.9,
        "ofrQty": 5000.0,
        "timestamp": 1660297190627
    }
}

```

## [section/WebSocket-API/Unsubscribe-from-market-data](https://open-api.capital.com/\#section/WebSocket-API/Unsubscribe-from-market-data) Unsubscribe from market data

**Destination:** `marketData.unsubscribe`

Unsubscribe from the prices updates

**Request message example:**

```java
{
    "destination": "marketData.unsubscribe",
    "correlationId": "2",
    "cst": "zvkT26****nsHKk",
    "securityToken": "g6K90****QKvCS7",
    "payload": {
        "epics": [\
            "OIL_CRUDE"\
        ]
    }
}

```

**Example of the response message about successful unsubscription:**

```java
{
    "status": "OK",
    "destination": "marketData.unsubscribe",
    "correlationId": "2",
    "payload": {
        "subscriptions": {
            "OIL_CRUDE": "PROCESSED"
        }
    }
}

```

## [section/WebSocket-API/Subscribe-to-OHLC-market-data](https://open-api.capital.com/\#section/WebSocket-API/Subscribe-to-OHLC-market-data) Subscribe to OHLC market data

**Destination:** `OHLCMarketData.subscribe`

Subscribe to the candlestick bars updates by mentioning the epics, resolutions and bar type

List of request payload parameters:

| **Parameter** | **Format** | **Required?** | **Description** |
| --- | --- | --- | --- |
| epics | string\[\] | YES | The list of instruments epics <br>Notes: <br>\- Max number of epics is limited to 40 |
| resolutions | string\[\] | NO | The list of resolutions of requested prices <br>Notes: <br>\- Default value: `MINUTE`<br>\- Possible values: `MINUTE`, `MINUTE_5`, `MINUTE_15`, `MINUTE_30`, `HOUR`, `HOUR_4`, `DAY`, `WEEK` |
| type | string | NO | Type of candlesticks <br>Notes: <br>\- Default value: `classic`<br>\- Possible values: `classic`, `heikin-ashi` |

**Request message example:**

```java
{
    "destination": "OHLCMarketData.subscribe",
    "correlationId": "3",
    "cst": "zvkT26****nsHKk",
    "securityToken": "g6K90****QKvCS7",
    "payload": {
        "epics": [\
            "OIL_CRUDE",\
            "AAPL"\
        ],
        "resolutions": [\
            "MINUTE_5"\
        ],
        "type": "classic"
    }
}

```

**Example of the response message about successful subscription:**

```java
{
    "status": "OK",
    "destination": "OHLCMarketData.subscribe",
    "correlationId": "3",
    "payload": {
        "subscriptions": {
            "OIL_CRUDE:MINUTE_5:classic": "PROCESSED",
            "AAPL:MINUTE_5:classic": "PROCESSED"
        }
    }
}

```

**Example of the response message with market data updates:**

```java
{
    "status": "OK",
    "destination": "ohlc.event",
    "payload": {
        "resolution": "MINUTE_5",
        "epic": "AAPL",
        "type": "classic",
        "priceType": "bid",
        "t": 1671714000000,
        "h": 134.95,
        "l": 134.85,
        "o": 134.86,
        "c": 134.88
    }
}

```

## [section/WebSocket-API/Unsubscribe-from-OHLC-market-data](https://open-api.capital.com/\#section/WebSocket-API/Unsubscribe-from-OHLC-market-data) Unsubscribe from OHLC market data

**Destination:** `OHLCMarketData.unsubscribe`

Unsubscribe from candlestick bars updates for specific epics, resolutions and bar types.

The general principle is as follows: you unsubscribe from the parameter you mention in the request. In case you mention epic you unsubscribe from all of the corresponding bar types and resolutions.

List of request payload parameters:

| **Parameter** | **Format** | **Required?** | **Description** |
| --- | --- | --- | --- |
| epics | string\[\] | YES | The list of instruments epics to be unsubscribed |
| resolutions | string\[\] | NO | The list of price resolutions to be unsubscribed <br>Notes: <br>\- Default value: All possible values <br>\- Possible values: `MINUTE`, `MINUTE_5`, `MINUTE_15`, `MINUTE_30`, `HOUR`, `HOUR_4`, `DAY`, `WEEK` |
| types | string\[\] | NO | Types of candlesticks to be unsubscribed <br>Notes: <br>\- Default value: all possible values <br>\- Possible values: `classic`, `heikin-ashi` |

**Request message example:**

```java
// Unsubscribe from candlestick bars updates of OIL_CRUDE epic with MINUTE and MINUTE_5 resolutions and heikin-ashi candlestick type
{
    "destination": "OHLCMarketData.unsubscribe",
    "correlationId": "4",
    "cst": "zvkT26****nsHKk",
    "securityToken": "g6K90****QKvCS7",
    "payload": {
        "epics": [\
            "OIL_CRUDE"\
        ],
        "resolutions": [\
            "MINUTE",\
            "MINUTE_5"\
        ],
        "types": [\
            "heikin-ashi"\
        ]
    }
}

```

**Example of the response message about successful unsubscription:**

```java
{
    "status": "OK",
    "destination": "OHLCMarketData.unsubscribe",
    "correlationId": "4",
    "payload": {
        "subscriptions": {
            "OIL_CRUDE:MINUTE_5:heikin-ashi": "PROCESSED",
            "OIL_CRUDE:MINUTE:heikin-ashi": "PROCESSED"
        }
    }
}

```

## [section/WebSocket-API/Ping-the-service](https://open-api.capital.com/\#section/WebSocket-API/Ping-the-service) Ping the service

**Destination:** `ping`

Ping the service for keeping the connection alive

**Request message example:**

```java
{
    "destination": "ping",
    "correlationId": "5",
    "cst": "zvkT26****nsHKk",
    "securityToken": "g6K90****QKvCS7"
}

```

**Response message example:**

```java
{
    "status": "OK",
    "destination": "ping",
    "correlationId": "5",
    "payload": {}
}

```

# [section/REST-API](https://open-api.capital.com/\#section/REST-API) REST API

Find below the list of all available REST API endpoints

# [tag/General](https://open-api.capital.com/\#tag/General) General

## [tag/General/paths/~1api~1v1~1time/get](https://open-api.capital.com/\#tag/General/paths/~1api~1v1~1time/get) Get server time

Test connectivity to the API and get the current server time

Authentication is not required for this endpoint

### Responses

**200**
OK

get/api/v1/time

Base Live URL

https://api-capital.backend-capital.com/api/v1/time

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/time

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/time", Method.Get);
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200

Content type

application/json

Copy

`{
"serverTime": 1649259764171}`

## [tag/General/paths/~1api~1v1~1ping/get](https://open-api.capital.com/\#tag/General/paths/~1api~1v1~1ping/get) Ping the service

Ping the service to keep a trading session alive

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token or account id identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

get/api/v1/ping

Base Live URL

https://api-capital.backend-capital.com/api/v1/ping

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/ping

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/ping", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200

Content type

application/json

Copy

`{
"status": "OK"}`

# [tag/Session](https://open-api.capital.com/\#tag/Session) Session

## [tag/Session/paths/~1api~1v1~1session~1encryptionKey/get](https://open-api.capital.com/\#tag/Session/paths/~1api~1v1~1session~1encryptionKey/get) Encryption key

Get the encryption key to use in order to send the API key password in an encrypted form

##### header Parameters

|     |     |
| --- | --- |
| X-CAP-API-KEY | string<br>Example:ENTER\_GENERATED\_API\_KEY<br>The API key obtained from Settings > API Integrations page on the Capital.com trading platform |

### Responses

**200**
OK

get/api/v1/session/encryptionKey

Base Live URL

https://api-capital.backend-capital.com/api/v1/session/encryptionKey

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/session/encryptionKey

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/session/encryptionKey", Method.Get);
request.AddHeader("X-CAP-API-KEY", "ENTER_GENERATED_API_KEY");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200

Content type

application/json

Copy

`{
"encryptionKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxOZgr4OMjNBMKpR+fZpxrDGGwDk3eGnrI+AvRq1X+psNZEjcQ/tR7XkXfy/BzhXKsrdJO4dqwFrULg03olkhapNpo0wr3Jhr3QLPOeX7bAvgL1pkg/1/ySX4ZPZ8tYuGFXRX0v/DeMYJFFiW1NjHS2phTlmVAHy6a5VRx/GmkvBxo/Xh6L0uaIZIbxNRoU1T+4oR7eaIVKtDL5uxX518EgvpU5QNFMg03Z+e5BTczCPR7xmnpKFMsu40zdICtdylxHXBupuh9zeQ5Rbx1xc72x3emUxL4PRCTh/t0gb9mCID4/AIQqSRykY9NpfkXGJV5mBN/3ZHJanHiE2mnVTlbwIBOOBA",
"timeStamp": 1649058606014}`

## [tag/Session/paths/~1api~1v1~1session/get](https://open-api.capital.com/\#tag/Session/paths/~1api~1v1~1session/get) Session details

Returns the user's session details

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token or account id identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

get/api/v1/session

Base Live URL

https://api-capital.backend-capital.com/api/v1/session

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/session

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/session", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200

Content type

application/json

Copy

`{
"clientId": "12345678",
"accountId": "12345678901234567",
"timezoneOffset": 3,
"locale": "en",
"currency": "USD",
"streamEndpoint": "wss://api-streaming-capital.backend-capital.com/"}`

## [tag/Session/paths/~1api~1v1~1session/post](https://open-api.capital.com/\#tag/Session/paths/~1api~1v1~1session/post) Create new session

Create a trading session, obtaining session tokens for subsequent API access

Session is active for 10 minutes. In case your inactivity is longer than this period then you need to create a new session

Endpoint limit: 1 request per second

List of request body parameters:

| **Parameter** | **Format** | **Required?** | **Description** |
| --- | --- | --- | --- |
| identifier | string | YES | Client login identifier |
| password | string | YES | API key custom password |
| encryptedPassword | boolean | NO | Whether the password has been encrypted. <br>Default value: `false` |

##### header Parameters

|     |     |
| --- | --- |
| X-CAP-API-KEY | string<br>Example:ENTER\_GENERATED\_API\_KEY<br>The API key obtained from Settings > API Integrations page on the Capital.com trading platform |

##### Request Body schema: application/json

object

### Responses

**200**
OK

**400**
Bad Request

**401**
Unauthorized

**429**
Too Many Requests

post/api/v1/session

Base Live URL

https://api-capital.backend-capital.com/api/v1/session

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/session

### Request samples

- Payload
- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Content type

application/json

Copy

`{
"identifier": "ENTER_YOUR_EMAIL",
"password": "ENTER_YOUR_PASSWORD"}`

### Response samples

- 200
- 400
- 401
- 429

Content type

text/plain

Example

Success: Session created (basic password)Success: Session created (encrypted password)Success: Session created (basic password)

Copy

```
{
	"accountType": "CFD",
	"accountInfo": {
        "balance": 92.89,
        "deposit": 90.38,
        "profitLoss": 2.51,
        "available": 64.66
    },
	"currencyIsoCode": "USD",
	"currencySymbol": "$",
	"currentAccountId": "12345678901234567",
	"streamingHost": "wss://api-streaming-capital.backend-capital.com/",
	"accounts": [\
        {\
            "accountId": "12345678901234567",\
            "accountName": "USD",\
            "preferred": true,\
            "accountType": "CFD",\
            "currency": "USD",\
            "symbol": "$",\
            "balance": {\
                "balance": 92.89,\
                "deposit": 90.38,\
                "profitLoss": 2.51,\
                "available": 64.66\
            }\
        },\
        {\
            "accountId": "12345678907654321",\
            "accountName": "EUR",\
            "preferred": false,\
            "accountType": "CFD",\
            "currency": "EUR",\
            "symbol": "€",\
            "balance": {\
                "balance": 0.0,\
                "deposit": 0.0,\
                "profitLoss": 0.0,\
                "available": 0.0\
            }\
        }\
	],
	"clientId": "12345678",
	"timezoneOffset": 3,
	"hasActiveDemoAccounts": true,
	"hasActiveLiveAccounts": true,
	"trailingStopsEnabled": false
}
```

## [tag/Session/paths/~1api~1v1~1session/put](https://open-api.capital.com/\#tag/Session/paths/~1api~1v1~1session/put) Switches active account

Switch active account

List of request body parameters:

| **Parameter** | **Format** | **Required?** | **Description** |
| --- | --- | --- | --- |
| accountId | string | YES | The identifier of the account being switched to |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

##### Request Body schema: application/json

object

### Responses

**200**
OK

**400**
Bad Request

put/api/v1/session

Base Live URL

https://api-capital.backend-capital.com/api/v1/session

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/session

### Request samples

- Payload
- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Content type

application/json

Copy

`{
"accountId": "12345678907654321"}`

### Response samples

- 200
- 400

Content type

application/json

Copy

`{
"trailingStopsEnabled": false,
"dealingEnabled": true,
"hasActiveDemoAccounts": false,
"hasActiveLiveAccounts": true}`

## [tag/Session/paths/~1api~1v1~1session/delete](https://open-api.capital.com/\#tag/Session/paths/~1api~1v1~1session/delete) Log out of the current session

Log out of the current session

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

delete/api/v1/session

Base Live URL

https://api-capital.backend-capital.com/api/v1/session

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/session

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/session", Method.Delete);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200

Content type

text/plain

Copy

```
{
    "status": "SUCCESS"
}
```

# [tag/Accounts](https://open-api.capital.com/\#tag/Accounts) Accounts

## [tag/Accounts/paths/~1api~1v1~1accounts/get](https://open-api.capital.com/\#tag/Accounts/paths/~1api~1v1~1accounts/get) All accounts

Returns a list of accounts belonging to the logged-in client

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

get/api/v1/accounts

Base Live URL

https://api-capital.backend-capital.com/api/v1/accounts

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/accounts

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/accounts", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{
"accounts": [\
{\
"accountId": "12345678901234567",\
"accountName": "USD",\
"status": "ENABLED",\
"accountType": "CFD",\
"preferred": true,\
"balance": {\
"balance": 92.89,\
"deposit": 90.38,\
"profitLoss": 2.51,\
"available": 64.66},\
"currency": "USD",\
"symbol": "$"},\
{\
"accountId": "12345678901234567",\
"accountName": "EUR",\
"status": "ENABLED",\
"accountType": "CFD",\
"preferred": false,\
"balance": {\
"balance": 0,\
"deposit": 0,\
"profitLoss": 0,\
"available": 0},\
"currency": "EUR",\
"symbol": "€"}]}`

## [tag/Accounts/paths/~1api~1v1~1accounts~1preferences/get](https://open-api.capital.com/\#tag/Accounts/paths/~1api~1v1~1accounts~1preferences/get) Account preferences

Returns account preferences, i.e. leverage settings and trading mode

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

get/api/v1/accounts/preferences

Base Live URL

https://api-capital.backend-capital.com/api/v1/accounts/preferences

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/accounts/preferences

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/accounts/preferences", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{
"hedgingMode": false,
"leverages": {
"SHARES": {
"current": 2,
"available": [\
1,\
2,\
3,\
5]},
"CURRENCIES": {
"current": 1,
"available": [\
1,\
10,\
20,\
30]},
"INDICES": {
"current": 10,
"available": [\
1,\
10,\
20]},
"CRYPTOCURRENCIES": {
"current": 1,
"available": [\
1,\
2]},
"COMMODITIES": {
"current": 5,
"available": [\
1,\
5,\
10,\
20]}}}`

## [tag/Accounts/paths/~1api~1v1~1accounts~1preferences/put](https://open-api.capital.com/\#tag/Accounts/paths/~1api~1v1~1accounts~1preferences/put) Update account preferences

Update account preferences

List of request body parameters:

| **Parameter** | **Format** | **Required?** | **Description** |
| --- | --- | --- | --- |
| leverages | object | NO | Set new leverage values |
| hedgingMode | boolean | NO | Enable or disable hedging mode |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

##### Request Body schema: application/json

object

### Responses

**200**
OK

**400**
Bad Request

put/api/v1/accounts/preferences

Base Live URL

https://api-capital.backend-capital.com/api/v1/accounts/preferences

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/accounts/preferences

### Request samples

- Payload
- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Content type

application/json

Copy
Expand all  Collapse all

`{
"leverages": {
"SHARES": 5,
"CURRENCIES": 10,
"INDICES": 20,
"CRYPTOCURRENCIES": 2,
"COMMODITIES": 5},
"hedgingMode": false}`

### Response samples

- 200
- 400

Content type

application/json

Copy

`{
"status": "SUCCESS"}`

## [tag/Accounts/paths/~1api~1v1~1history~1activity/get](https://open-api.capital.com/\#tag/Accounts/paths/~1api~1v1~1history~1activity/get) Account activity history

Returns the account activity history

All query parameters are optional for this request

The maximum possible date range between `from` and `to` parameters is 1 day. If only one of the parameters is specified ( `from` or `to`), the 1-day date range will be selected by default

Possible enum values for parameters in FIQL filter:

| **Parameter** | **ENUM** |
| --- | --- |
| source | `CLOSE_OUT`, `DEALER`, `SL`, `SYSTEM`, `TP`, `USER` |
| status | `ACCEPTED`, `CREATED`, `EXECUTED`, `EXPIRED`, `REJECTED`, `MODIFIED`, `MODIFY_REJECT`, `CANCELLED`, `CANCEL_REJECT`, `UNKNOWN` |
| type | `POSITION`, `WORKING_ORDER`, `EDIT_STOP_AND_LIMIT`, `SWAP`, `SYSTEM` |

##### query Parameters

|     |     |
| --- | --- |
| from | string<br>Example:from=2022-01-17T15:09:47<br>Start date. Date format: YYYY-MM-DDTHH:MM:SS (e.g. 2022-04-01T01:01:00). Filtration by date based on dateUTC parameter |
| to | string<br>Example:to=2022-01-17T15:10:05<br>End date. Date format: YYYY-MM-DDTHH:MM:SS (e.g. 2022-04-01T01:01:00). Filtration by date based on dateUTC parameter |
| lastPeriod | integer<br>Example:lastPeriod=600<br>Limits the timespan in seconds through to current time (not applicable if a date range has been specified). Cannot be bigger than current Unix timestamp value. Default = 600, max = 86400 |
| detailed | boolean<br>Example:detailed=true<br>Indicates whether to retrieve additional details about the activity. False by default |
| dealId | string<br>Example:dealId={{dealId}}<br>Get activity information for specific dealId |
| filter | string<br>Example:filter=source!=DEALER;type!=POSITION;status==REJECTED;epic==OIL\_CRUDE,GOLD<br>Filter activity list using FIQL. List of supported parameters: epic, source, status, type |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

**400**
Bad Request

get/api/v1/history/activity

Base Live URL

https://api-capital.backend-capital.com/api/v1/history/activity

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/history/activity

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/history/activity?from=2022-01-17T15:09:47&to=2022-01-17T15:10:05&lastPeriod=600&detailed=true&dealId={{dealId}}&filter=source!=DEALER;type!=POSITION;status==REJECTED;epic==OIL_CRUDE,GOLD", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200
- 400

Content type

application/json

Example

Success: Filter list by dateSuccess: Filter list using FIQL filterSuccess: Filter list by dealId with enabled detailed viewSuccess: Filter list by date

Copy
Expand all  Collapse all

`{
"activities": [\
{\
"date": "2022-01-17T18:09:47.344",\
"dateUTC": "2022-01-17T15:09:47.344",\
"epic": "OIL_CRUDE",\
"dealId": "00018509-0001-54c4-0000-000080430164",\
"source": "USER",\
"type": "POSITION",\
"status": "ACCEPTED"},\
{\
"date": "2022-01-17T18:09:47.344",\
"dateUTC": "2022-01-17T15:09:47.344",\
"epic": "OIL_CRUDE",\
"dealId": "00018509-0001-54c4-0000-000080430163",\
"source": "SYSTEM",\
"type": "WORKING_ORDER",\
"status": "ACCEPTED"},\
{\
"date": "2022-01-17T18:09:47.344",\
"dateUTC": "2022-01-17T15:09:47.344",\
"epic": "OIL_CRUDE",\
"dealId": "00018509-0001-54c4-0000-000080430163",\
"source": "USER",\
"type": "WORKING_ORDER",\
"status": "ACCEPTED"}]}`

## [tag/Accounts/paths/~1api~1v1~1history~1transactions/get](https://open-api.capital.com/\#tag/Accounts/paths/~1api~1v1~1history~1transactions/get) Account transactions history

Returns the transaction history. By default returns the transactions within the last 10 minutes

All query parameters are optional for this request

##### query Parameters

|     |     |
| --- | --- |
| from | string<br>Example:from=2021-08-10T00:00:00<br>Start date. Date format: YYYY-MM-DDTHH:MM:SS (e.g. 2022-04-01T01:01:00). Filtration by date based on dateUTC parameter |
| to | string<br>Example:to=2021-09-10T00:00:01<br>End date. Date format: YYYY-MM-DDTHH:MM:SS (e.g. 2022-04-01T01:01:00). Filtration by date based on dateUTC parameter |
| lastPeriod | integer<br>Example:lastPeriod=600<br>Limits the timespan in seconds through to current time (not applicable if a date range has been specified). Cannot be bigger than current Unix timestamp value. Default = 600 |
| type | string<br>Example:type=DEPOSIT<br>Transaction type. Possible values: INACTIVITY\_FEE, RESERVE, VOID, UNRESERVE, WRITE\_OFF\_OR\_CREDIT, CREDIT\_FACILITY, FX\_COMMISSION, COMPLAINT\_SETTLEMENT, DEPOSIT, WITHDRAWAL, REFUND, WITHDRAWAL\_MONEY\_BACK, TRADE, SWAP, TRADE\_COMMISSION, TRADE\_COMMISSION\_GSL, NEGATIVE\_BALANCE\_PROTECTION, TRADE\_CORRECTION, CHARGEBACK, ADJUSTMENT, BONUS, TRANSFER, CORPORATE\_ACTION, CONVERSION, REBATE, TRADE\_SLIPPAGE\_PROTECTION |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

get/api/v1/history/transactions

Base Live URL

https://api-capital.backend-capital.com/api/v1/history/transactions

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/history/transactions

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/history/transactions?from=2021-08-10T00:00:00&to=2021-09-10T00:00:01&lastPeriod=600&type=DEPOSIT", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200

Content type

application/json

Example

Success: Get list of transactions within last hourSuccess: Filter list within last 30 second by typeSuccess: Get list of transactions within last hour

Copy
Expand all  Collapse all

`{
"transactions": [\
{\
"date": "2022-04-04T16:51:05.648",\
"dateUtc": "2022-04-04T16:51:05.648",\
"instrumentName": "NATURALGAS",\
"transactionType": "TRADE",\
"note": "Trade closed",\
"reference": "12345678",\
"size": "1.05",\
"currency": "USD",\
"status": "PROCESSED"},\
{\
"date": "2022-04-04T16:51:00.788",\
"dateUtc": "2022-04-04T16:51:00.788",\
"instrumentName": "US500",\
"transactionType": "TRADE",\
"note": "Trade closed",\
"reference": "87654321",\
"size": "416.0",\
"currency": "USD",\
"status": "PROCESSED"}]}`

## [tag/Accounts/paths/~1api~1v1~1accounts~1topUp/post](https://open-api.capital.com/\#tag/Accounts/paths/~1api~1v1~1accounts~1topUp/post) Adjust balance of Demo account

Adjust the balance of the current Demo account.

Note: The balance of the Demo account cannot exceed 100000.

Limits:

- 10 requests per second;
- 100 requests per account per day.

List of request body parameters:

| **Parameter** | **Format** | **Required?** | **Description** |
| --- | --- | --- | --- |
| amount | number | YES | The amount of funds that will be added to the Demo account balance <br>Notes: <br>\- Min value = -400000 <br>\- Max value = 400000 |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

##### Request Body schema: application/json

object

### Responses

**200**
OK

**400**
Bad Request

post/api/v1/accounts/topUp

Base Live URL

https://api-capital.backend-capital.com/api/v1/accounts/topUp

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/accounts/topUp

### Request samples

- Payload
- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Content type

application/json

Copy

`{
"amount": 1000}`

### Response samples

- 200
- 400

Content type

application/json

Copy

`{
"successful": true}`

# [tag/Trading](https://open-api.capital.com/\#tag/Trading) Trading

## [tag/Trading/paths/~1api~1v1~1confirms~1{dealReference}/get](https://open-api.capital.com/\#tag/Trading/paths/~1api~1v1~1confirms~1{dealReference}/get) Position/Order confirmation

Returns a deal confirmation for the given deal reference

In case of mentioning the order prefix formed because of the position creation the opened positions IDs will be shown in the `affectedDeals` array

##### path Parameters

|     |     |
| --- | --- |
| dealReference<br>required | string<br>Example:{{dealReference}}<br>Deal reference for an unconfirmed trade |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

**404**
Not Found

get/api/v1/confirms/{dealReference}

Base Live URL

https://api-capital.backend-capital.com/api/v1/confirms/{dealReference}

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/confirms/{dealReference}

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/confirms/{{dealReference}}", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200
- 404

Content type

application/json

Copy
Expand all  Collapse all

`{
"date": "2022-04-06T07:32:19.193",
"status": "OPEN",
"dealStatus": "ACCEPTED",
"epic": "SILVER",
"dealReference": "o_fcc7e6c0-c150-48aa-bf66-d6c6da071f1a",
"dealId": "006011e7-0001-54c4-0000-000080560043",
"affectedDeals": [\
{\
"dealId": "006011e7-0001-54c4-0000-000080560045",\
"status": "OPENED"}],
"level": 24.285,
"size": 1,
"direction": "BUY",
"guaranteedStop": false,
"trailingStop": false}`

# [tag/Trading-greater-Rositions](https://open-api.capital.com/\#tag/Trading-greater-Rositions) Trading > Рositions

## [tag/Trading-greater-Rositions/paths/~1api~1v1~1positions/get](https://open-api.capital.com/\#tag/Trading-greater-Rositions/paths/~1api~1v1~1positions/get) All positions

Returns all open positions for the active account

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

get/api/v1/positions

Base Live URL

https://api-capital.backend-capital.com/api/v1/positions

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/positions

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/positions", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{
"positions": [\
{\
"position": {\
"contractSize": 1,\
"createdDate": "2022-04-05T12:46:01.872",\
"createdDateUTC": "2022-04-05T09:46:01.872",\
"dealId": "00018387-0001-54c4-0000-000080560014",\
"dealReference": "p_00018387-0001-54c4-0000-000080560014",\
"workingOrderId": "00018387-0001-54c4-0000-000080560012",\
"size": 10,\
"leverage": 20,\
"upl": -0.05,\
"direction": "BUY",\
"level": 2.764,\
"currency": "USD",\
"guaranteedStop": false},\
"market": {\
"instrumentName": "Natural Gas",\
"expiry": "-",\
"marketStatus": "TRADEABLE",\
"epic": "NATURALGAS",\
"symbol": "Natural Gas",\
"instrumentType": "COMMODITIES",\
"lotSize": 1,\
"high": 2.798,\
"low": 2.743,\
"percentageChange": 0.8053,\
"netChange": 0.022,\
"bid": 2.759,\
"offer": 2.764,\
"updateTime": "2022-04-05T17:41:38.492",\
"updateTimeUTC": "2022-04-05T14:41:38.492",\
"delayTime": 0,\
"streamingPricesAvailable": true,\
"scalingFactor": 1,\
"marketModes": [\
"REGULAR"]}},\
{\
"position": {\
"contractSize": 1,\
"createdDate": "2022-04-05T12:46:10.139",\
"createdDateUTC": "2022-04-05T09:46:10.139",\
"dealId": "004d0627-0001-54c4-0000-000080560017",\
"dealReference": "p_004d0627-0001-54c4-0000-000080560017",\
"workingOrderId": "004d0627-0001-54c4-0000-000080560015",\
"size": 1,\
"leverage": 20,\
"upl": -0.8,\
"direction": "BUY",\
"level": 3985.1,\
"currency": "USD",\
"guaranteedStop": false},\
"market": {\
"instrumentName": "S&P 500",\
"expiry": "2022-02-01",\
"marketStatus": "TRADEABLE",\
"epic": "US500",\
"symbol": "US500",\
"instrumentType": "INDICES",\
"lotSize": 1,\
"high": 3984.6,\
"low": 3950.3,\
"percentageChange": -0.0301,\
"netChange": -1.2,\
"bid": 3984.3,\
"offer": 3985.1,\
"updateTime": "2022-04-05T17:41:37.991",\
"updateTimeUTC": "2022-04-05T14:41:37.991",\
"delayTime": 0,\
"streamingPricesAvailable": true,\
"scalingFactor": 1,\
"marketModes": [\
"REGULAR"]}}]}`

## [tag/Trading-greater-Rositions/paths/~1api~1v1~1positions/post](https://open-api.capital.com/\#tag/Trading-greater-Rositions/paths/~1api~1v1~1positions/post) Create position

Create orders and positions

Please note that when creating the position an order is created first with the 'o\_' prefix in the `dealReference` parameter

List of request body parameters:

| **Parameter** | **Format** | **Required?** | **Description** |
| --- | --- | --- | --- |
| direction | string | YES | Deal direction <br>Must be `BUY` or `SELL` |
| epic | string | YES | Instrument epic identifier |
| size | number | YES | Deal size |
| guaranteedStop | boolean | NO | Must be `true` if a guaranteed stop is required <br>Notes: <br>\- Default value: `false`<br>\- If `guaranteedStop` equals `true`, then set `stopLevel`, `stopDistance` or `stopAmount`<br>\- Cannot be set if `trailingStop` is `true`<br>\- Cannot be set if `hedgingMode` is `true` |
| trailingStop | boolean | NO | Must be `true` if a trailing stop is required <br>Notes: <br>\- Default value: `false`<br>\- If `trailingStop` equals `true`, then set `stopDistance`<br>\- Cannot be set if `guaranteedStop` is `true` |
| stopLevel | number | NO | Price level when a stop loss will be triggered |
| stopDistance | number | NO | Distance between current and stop loss triggering price <br>Notes: <br>\- Required parameter if `trailingStop` is `true` |
| stopAmount | number | NO | Loss amount when a stop loss will be triggered |
| profitLevel | number | NO | Price level when a take profit will be triggered |
| profitDistance | number | NO | Distance between current and take profit triggering price |
| profitAmount | number | NO | Profit amount when a take profit will be triggered |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

##### Request Body schema: application/json

object

### Responses

**200**
OK

**400**
Bad Request

post/api/v1/positions

Base Live URL

https://api-capital.backend-capital.com/api/v1/positions

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/positions

### Request samples

- Payload
- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Content type

application/json

Copy

`{
"epic": "SILVER",
"direction": "BUY",
"size": 1,
"guaranteedStop": true,
"stopLevel": 20,
"profitLevel": 27}`

### Response samples

- 200
- 400

Content type

application/json

Example

Success: Create simple positionSuccess: Create position with stop loss, take profit and guaranteed stopSuccess: Create simple position

Copy

`{
"dealReference": "o_98c0de50-9cd5-4481-8d81-890c525eeb49"}`

## [tag/Trading-greater-Rositions/paths/~1api~1v1~1positions~1{dealId}/get](https://open-api.capital.com/\#tag/Trading-greater-Rositions/paths/~1api~1v1~1positions~1{dealId}/get) Single position

Returns an open position for the active account by deal identifier

##### path Parameters

|     |     |
| --- | --- |
| dealId<br>required | string<br>Example:{{dealId}}<br>Permanent deal reference for a confirmed trade |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

**404**
Not Found

get/api/v1/positions/{dealId}

Base Live URL

https://api-capital.backend-capital.com/api/v1/positions/{dealId}

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/positions/{dealId}

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/positions/{{dealId}}", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200
- 404

Content type

application/json

Copy
Expand all  Collapse all

`{
"position": {
"contractSize": 1,
"createdDate": "2022-04-06T10:49:52.056",
"createdDateUTC": "2022-04-06T07:49:52.056",
"dealId": "006011e7-0001-54c4-0000-00008056005e",
"dealReference": "p_006011e7-0001-54c4-0000-00008056005e",
"workingOrderId": "006011e7-0001-54c4-0000-00008056005c",
"size": 1,
"leverage": 20,
"upl": -0.022,
"direction": "BUY",
"level": 21.059,
"currency": "USD",
"guaranteedStop": false},
"market": {
"instrumentName": "Silver",
"expiry": "-",
"marketStatus": "TRADEABLE",
"epic": "SILVER",
"symbol": "Natural Gas",
"instrumentType": "COMMODITIES",
"lotSize": 1,
"high": 21.167,
"low": 20.823,
"percentageChange": 1.8478,
"netChange": 0.381,
"bid": 21.037,
"offer": 21.057,
"updateTime": "2022-04-06T10:53:35.389",
"updateTimeUTC": "2022-04-06T07:53:35.389",
"delayTime": 0,
"streamingPricesAvailable": true,
"scalingFactor": 1,
"marketModes": [\
"REGULAR"]}}`

## [tag/Trading-greater-Rositions/paths/~1api~1v1~1positions~1{dealId}/put](https://open-api.capital.com/\#tag/Trading-greater-Rositions/paths/~1api~1v1~1positions~1{dealId}/put) Update position

Update the position

List of request body parameters:

| **Parameter** | **Format** | **Required?** | **Description** |
| --- | --- | --- | --- |
| guaranteedStop | boolean | NO | Must be `true` if a guaranteed stop is required <br>Notes: <br>\- Default value: `false`<br>\- If `guaranteedStop` equals `true`, then set `stopLevel`, `stopDistance` or `stopAmount`<br>\- Cannot be set if `trailingStop` is `true`<br>\- Cannot be set if `hedgingMode` is `true` |
| trailingStop | boolean | NO | Must be `true` if a trailing stop is required <br>Notes: <br>\- Default value: `false`<br>\- If `trailingStop` equals `true`, then set `stopDistance`<br>\- Cannot be set if `guaranteedStop` is `true` |
| stopLevel | number | NO | Price level when a stop loss will be triggered |
| stopDistance | number | NO | Distance between current and stop loss triggering price <br>Notes: <br>\- Required parameter if `trailingStop` is `true` |
| stopAmount | number | NO | Loss amount when a stop loss will be triggered |
| profitLevel | number | NO | Price level when a take profit will be triggered |
| profitDistance | number | NO | Distance between current and take profit triggering price |
| profitAmount | number | NO | Profit amount when a take profit will be triggered |

##### path Parameters

|     |     |
| --- | --- |
| dealId<br>required | string<br>Example:{{dealId}}<br>Permanent deal reference for a confirmed trade |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

##### Request Body schema: application/json

object

### Responses

**200**
OK

**400**
Bad Request

**404**
Not Found

put/api/v1/positions/{dealId}

Base Live URL

https://api-capital.backend-capital.com/api/v1/positions/{dealId}

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/positions/{dealId}

### Request samples

- Payload
- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Content type

application/json

Copy

`{
"guaranteedStop": true,
"stopDistance": 3,
"profitAmount": 2}`

### Response samples

- 200
- 400
- 404

Content type

application/json

Copy

`{
"dealReference": "p_006011e7-0001-54c4-0000-000080560068"}`

## [tag/Trading-greater-Rositions/paths/~1api~1v1~1positions~1{dealId}/delete](https://open-api.capital.com/\#tag/Trading-greater-Rositions/paths/~1api~1v1~1positions~1{dealId}/delete) Close position

Close the position

##### path Parameters

|     |     |
| --- | --- |
| dealId<br>required | string<br>Example:{{dealId}}<br>Permanent deal reference for a confirmed trade |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

**404**
Not Found

delete/api/v1/positions/{dealId}

Base Live URL

https://api-capital.backend-capital.com/api/v1/positions/{dealId}

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/positions/{dealId}

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/positions/{{dealId}}", Method.Delete);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200
- 404

Content type

application/json

Copy

`{
"dealReference": "p_006011e7-0001-54c4-0000-000080560068"}`

# [tag/Trading-greater-Orders](https://open-api.capital.com/\#tag/Trading-greater-Orders) Trading > Orders

## [tag/Trading-greater-Orders/paths/~1api~1v1~1workingorders/get](https://open-api.capital.com/\#tag/Trading-greater-Orders/paths/~1api~1v1~1workingorders/get) All working orders

Returns all open working orders for the active account

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

get/api/v1/workingorders

Base Live URL

https://api-capital.backend-capital.com/api/v1/workingorders

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/workingorders

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/workingorders", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{
"workingOrders": [\
{\
"workingOrderData": {\
"dealId": "006011e7-0001-54c4-0000-000080560078",\
"direction": "BUY",\
"epic": "SILVER",\
"orderSize": 1,\
"leverage": 10,\
"orderLevel": 20,\
"timeInForce": "GOOD_TILL_DATE",\
"goodTillDate": "2022-06-09T04:01:00.000",\
"goodTillDateUTC": "2022-06-09T01:01:00.000",\
"createdDate": "2022-04-06T12:48:28.114",\
"createdDateUTC": "2022-04-06T09:48:28.114",\
"guaranteedStop": true,\
"orderType": "LIMIT",\
"stopDistance": -3,\
"profitDistance": 3,\
"trailingStop": false,\
"currencyCode": "USD"},\
"marketData": {\
"instrumentName": "Silver",\
"expiry": "-",\
"marketStatus": "TRADEABLE",\
"epic": "SILVER",\
"symbol": "Silver",\
"instrumentType": "COMMODITIES",\
"lotSize": 50,\
"high": 24.398,\
"low": 24.193,\
"percentageChange": -0.6198,\
"netChange": -0.152,\
"bid": 24.387,\
"offer": 24.407,\
"updateTime": "2022-04-06T12:48:31.587",\
"updateTimeUTC": "2022-04-06T09:48:31.587",\
"delayTime": 0,\
"streamingPricesAvailable": true,\
"scalingFactor": 1,\
"marketModes": [\
"REGULAR"]}},\
{\
"workingOrderData": {\
"dealId": "00018387-0001-54c4-0000-000080560019",\
"direction": "BUY",\
"epic": "NATURALGAS",\
"orderSize": 1,\
"leverage": 10,\
"orderLevel": 6,\
"timeInForce": "GOOD_TILL_CANCELLED",\
"createdDate": "2022-04-06T12:13:46.571",\
"createdDateUTC": "2022-04-06T09:13:46.571",\
"guaranteedStop": false,\
"orderType": "LIMIT",\
"trailingStop": false,\
"currencyCode": "USD"},\
"marketData": {\
"instrumentName": "Natural Gas",\
"expiry": "-",\
"marketStatus": "TRADEABLE",\
"epic": "NATURALGAS",\
"symbol": "Natural Gas",\
"instrumentType": "COMMODITIES",\
"lotSize": 1000,\
"high": 6.194,\
"low": 6.073,\
"percentageChange": 6.4472,\
"netChange": 0.374,\
"bid": 6.185,\
"offer": 6.195,\
"updateTime": "2022-04-06T12:48:24.795",\
"updateTimeUTC": "2022-04-06T09:48:24.795",\
"delayTime": 0,\
"streamingPricesAvailable": true,\
"scalingFactor": 1,\
"marketModes": [\
"REGULAR"]}}]}`

## [tag/Trading-greater-Orders/paths/~1api~1v1~1workingorders/post](https://open-api.capital.com/\#tag/Trading-greater-Orders/paths/~1api~1v1~1workingorders/post) Create working order

Create a limit or stop order

List of request body parameters:

| **Parameter** | **Format** | **Required?** | **Description** |
| --- | --- | --- | --- |
| direction | string | YES | Order direction <br>Must be `BUY` or `SELL` |
| epic | string | YES | Instrument epic identifier |
| size | number | YES | Order size |
| level | number | YES | Order price |
| type | string | YES | Order type <br>Must be `LIMIT` or `STOP` |
| goodTillDate | string | NO | Order cancellation date in UTC time <br>Date format: `YYYY-MM-DDTHH:MM:SS` (e.g. `2022-06-09T01:01:00`) |
| guaranteedStop | boolean | NO | Must be `true` if a guaranteed stop is required <br>Notes: <br>\- Default value: `false`<br>\- If `guaranteedStop` equals `true`, then set `stopLevel`, `stopDistance` or `stopAmount`<br>\- Cannot be set if `trailingStop` is `true`<br>\- Cannot be set if `hedgingMode` is `true` |
| trailingStop | boolean | NO | Must be `true` if a trailing stop is required <br>Notes: <br>\- Default value: `false`<br>\- If `trailingStop` equals `true`, then set `stopDistance`<br>\- Cannot be set if `guaranteedStop` is `true` |
| stopLevel | number | NO | Price level when a stop loss will be triggered |
| stopDistance | number | NO | Distance between current and stop loss triggering price <br>Notes: <br>\- Required parameter if `trailingStop` is `true` |
| stopAmount | number | NO | Loss amount when a stop loss will be triggered |
| profitLevel | number | NO | Price level when a take profit will be triggered |
| profitDistance | number | NO | Distance between current and take profit triggering price |
| profitAmount | number | NO | Profit amount when a take profit will be triggered |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

##### Request Body schema: application/json

object

### Responses

**200**
OK

**400**
Bad Request

post/api/v1/workingorders

Base Live URL

https://api-capital.backend-capital.com/api/v1/workingorders

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/workingorders

### Request samples

- Payload
- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Content type

application/json

Copy

`{
"epic": "SILVER",
"direction": "BUY",
"size": 1,
"level": 20,
"type": "LIMIT"}`

### Response samples

- 200
- 400

Content type

application/json

Example

Success: Create limit orderSuccess: Create order with stop loss, take profit, guaranteed stop and cancellation dateSuccess: Create limit order

Copy

`{
"dealReference": "o_307bb379-6dd8-4ea7-8935-faf725f0e0a3"}`

## [tag/Trading-greater-Orders/paths/~1api~1v1~1workingorders~1{dealId}/put](https://open-api.capital.com/\#tag/Trading-greater-Orders/paths/~1api~1v1~1workingorders~1{dealId}/put) Update working order

Update a limit or stop order

List of request body parameters:

| **Parameter** | **Format** | **Required?** | **Description** |
| --- | --- | --- | --- |
| level | number | NO | Order price |
| goodTillDate | string | NO | Order cancellation date in UTC time <br>Date format: `YYYY-MM-DDTHH:MM:SS` (e.g. `2022-06-09T01:01:00`) |
| guaranteedStop | boolean | NO | Must be `true` if a guaranteed stop is required <br>Notes: <br>\- Default value: `false`<br>\- If `guaranteedStop` equals `true`, then set `stopLevel`, `stopDistance` or `stopAmount`<br>\- Cannot be set if `trailingStop` is `true`<br>\- Cannot be set if `hedgingMode` is `true` |
| trailingStop | boolean | NO | Must be `true` if a trailing stop is required <br>Notes: <br>\- Default value: `false`<br>\- If `trailingStop` equals `true`, then set `stopDistance`<br>\- Cannot be set if `guaranteedStop` is `true` |
| stopLevel | number | NO | Price level when a stop loss will be triggered |
| stopDistance | number | NO | Distance between current and stop loss triggering price <br>Notes: <br>\- Required parameter if `trailingStop` is `true` |
| stopAmount | number | NO | Loss amount when a stop loss will be triggered |
| profitLevel | number | NO | Price level when a take profit will be triggered |
| profitDistance | number | NO | Distance between current and take profit triggering price |
| profitAmount | number | NO | Profit amount when a take profit will be triggered |

##### path Parameters

|     |     |
| --- | --- |
| dealId<br>required | string<br>Example:{{dealId}}<br>Permanent deal reference for an order |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

##### Request Body schema: application/json

object

### Responses

**200**
OK

**404**
Not Found

put/api/v1/workingorders/{dealId}

Base Live URL

https://api-capital.backend-capital.com/api/v1/workingorders/{dealId}

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/workingorders/{dealId}

### Request samples

- Payload
- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Content type

application/json

Copy

`{
"goodTillDate": "2022-06-09T01:01:00",
"guaranteedStop": true,
"stopDistance": 4,
"profitDistance": 4}`

### Response samples

- 200
- 404

Content type

application/json

Copy

`{
"dealReference": "o_56e73aad-45fe-4058-a05b-569b1a6e8ba0"}`

## [tag/Trading-greater-Orders/paths/~1api~1v1~1workingorders~1{dealId}/delete](https://open-api.capital.com/\#tag/Trading-greater-Orders/paths/~1api~1v1~1workingorders~1{dealId}/delete) Delete working order

Delete a limit or stop order

##### path Parameters

|     |     |
| --- | --- |
| dealId<br>required | string<br>Example:{{dealId}}<br>Permanent deal reference for an order |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

**404**
Not Found

delete/api/v1/workingorders/{dealId}

Base Live URL

https://api-capital.backend-capital.com/api/v1/workingorders/{dealId}

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/workingorders/{dealId}

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/workingorders/{{dealId}}", Method.Delete);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200
- 404

Content type

application/json

Copy

`{
"dealReference": "o_38323f0c-241a-43b3-8edf-a75d2ae989a5"}`

# [tag/Markets-Info-greater-Markets](https://open-api.capital.com/\#tag/Markets-Info-greater-Markets) Markets Info > Markets

## [tag/Markets-Info-greater-Markets/paths/~1api~1v1~1marketnavigation/get](https://open-api.capital.com/\#tag/Markets-Info-greater-Markets/paths/~1api~1v1~1marketnavigation/get) All top-level market categories

Returns all top-level nodes (market categories) in the market navigation hierarchy

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

get/api/v1/marketnavigation

Base Live URL

https://api-capital.backend-capital.com/api/v1/marketnavigation

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/marketnavigation

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/marketnavigation", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{
"nodes": [\
{\
"id": "hierarchy_v1.commons_group",\
"name": "commons_group"},\
{\
"id": "hierarchy_v1.commodities_group",\
"name": "commodities_group"},\
{\
"id": "hierarchy_v1.oil_markets_group",\
"name": "oil_markets_group"}]}`

## [tag/Markets-Info-greater-Markets/paths/~1api~1v1~1marketnavigation~1{nodeId}/get](https://open-api.capital.com/\#tag/Markets-Info-greater-Markets/paths/~1api~1v1~1marketnavigation~1{nodeId}/get) All category sub-nodes

Returns all sub-nodes (markets) of the given node (market category) in the market navigation hierarchy

##### path Parameters

|     |     |
| --- | --- |
| nodeId<br>required | string<br>Example:{{nodeId}}<br>Identifier of the node to browse |

##### query Parameters

|     |     |
| --- | --- |
| limit | integer<br>Example:limit=500<br>The maximum number of the markets in answer. Default = 500, max = 500 |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

**400**
Bad Request

get/api/v1/marketnavigation/{nodeId}

Base Live URL

https://api-capital.backend-capital.com/api/v1/marketnavigation/{nodeId}

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/marketnavigation/{nodeId}

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/marketnavigation/{{nodeId}}?limit=500", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200
- 400

Content type

application/json

Example

Success: List of category sub-nodesSuccess: List of markets in category with limit = 2Success: List of category sub-nodes

Copy
Expand all  Collapse all

`{
"nodes": [\
{\
"id": "hierarchy_v1.commons.most_traded",\
"name": "Most Traded"},\
{\
"id": "hierarchy_v1.commons.recently_traded",\
"name": "Recently Traded"},\
{\
"id": "hierarchy_v1.commons.new",\
"name": "New"},\
{\
"id": "hierarchy_v1.commons.top_gainers",\
"name": "Top Risers"},\
{\
"id": "hierarchy_v1.commons.top_losers",\
"name": "Top Fallers"},\
{\
"id": "hierarchy_v1.commons.most_volatile",\
"name": "Most Volatile"},\
{\
"id": "hierarchy_v1.commons.weekend_trading",\
"name": "Weekend Trading"}]}`

## [tag/Markets-Info-greater-Markets/paths/~1api~1v1~1markets/get](https://open-api.capital.com/\#tag/Markets-Info-greater-Markets/paths/~1api~1v1~1markets/get) Markets details

Returns the details of all or specific markets

If query parameters are not specified in the request, the list of all available markets will be returned

Request can include one of the query parameters: `searchTerm` or `epics`

If both `searchTerm` or `epics` parameters are specified in the request, only `searchTerm` will be used (due to higher priority)

##### query Parameters

|     |     |
| --- | --- |
| searchTerm | string<br>Example:searchTerm=silver<br>The term to be used in the search. Has higher priority, than 'epics' parameter meaning that in case both searchTerm and epic are mentioned only searchTerm is taken into consideration. |
| epics | string<br>Example:epics=SILVER,NATURALGAS<br>The epics of the market, separated by a comma. Max number of epics is limited to 50 |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

**400**
Bad Request

get/api/v1/markets

Base Live URL

https://api-capital.backend-capital.com/api/v1/markets

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/markets

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/markets?searchTerm=silver&epics=SILVER,NATURALGAS", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200
- 400

Content type

application/json

Example

Successful response: searchTermSuccessful response: epicsSuccessful response: searchTerm

Copy
Expand all  Collapse all

`{
"markets": [\
{\
"delayTime": 0,\
"epic": "SILVER",\
"symbol": "Silver",\
"netChange": -0.219,\
"lotSize": 1,\
"expiry": "-",\
"instrumentType": "COMMODITIES",\
"instrumentName": "Silver",\
"high": 24.405,\
"low": 24.119,\
"percentageChange": -0.8929,\
"updateTime": "2022-04-06T15:17:38.477",\
"updateTimeUTC": "2022-04-06T13:17:38.477",\
"bid": 24.366,\
"offer": 24.386,\
"streamingPricesAvailable": true,\
"marketStatus": "TRADEABLE",\
"scalingFactor": 1,\
"marketModes": [\
"REGULAR"],\
"pipPosition": 2,\
"tickSize": 0.001},\
{\
"delayTime": 0,\
"epic": "5CPSG",\
"symbol": "5CPsg",\
"netChange": 0.005,\
"lotSize": 1,\
"expiry": "-",\
"instrumentType": "SHARES",\
"instrumentName": "Silverlake Axis",\
"high": 0.318,\
"low": 0.313,\
"percentageChange": 1.5974,\
"updateTime": "2022-04-06T11:00:00.440",\
"updateTimeUTC": "2022-04-06T09:00:00.440",\
"bid": 0.318,\
"offer": 0.327,\
"streamingPricesAvailable": true,\
"marketStatus": "CLOSED",\
"scalingFactor": 1,\
"marketModes": [\
"VIEW_ONLY"],\
"pipPosition": 2,\
"tickSize": 0.001}]}`

## [tag/Markets-Info-greater-Markets/paths/~1api~1v1~1markets~1{epic}/get](https://open-api.capital.com/\#tag/Markets-Info-greater-Markets/paths/~1api~1v1~1markets~1{epic}/get) Single market details

Returns the details of the given market

##### path Parameters

|     |     |
| --- | --- |
| epic<br>required | string<br>Example:{{epic}}<br>The epic of the market |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

**404**
Not Found

get/api/v1/markets/{epic}

Base Live URL

https://api-capital.backend-capital.com/api/v1/markets/{epic}

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/markets/{epic}

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/markets/{{epic}}", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200
- 404

Content type

application/json

Copy
Expand all  Collapse all

`{
"instrument": {
"epic": "SILVER",
"symbol": "Silver",
"expiry": "-",
"name": "Silver",
"lotSize": 1,
"type": "COMMODITIES",
"guaranteedStopAllowed": true,
"streamingPricesAvailable": true,
"currency": "USD",
"marginFactor": 10,
"marginFactorUnit": "PERCENTAGE",
"openingHours": {
"mon": [\
"00:00 - 21:59",\
"23:05 - 00:00"],
"tue": [\
"00:00 - 21:59",\
"23:05 - 00:00"],
"wed": [\
"00:00 - 21:59",\
"23:05 - 00:00"],
"thu": [\
"00:00 - 21:59",\
"23:05 - 00:00"],
"fri": [\
"00:00 - 21:59"],
"sat": [ ],
"sun": [\
"23:05 - 00:00"],
"zone": "UTC"},
"overnightFee": {
"longRate": -0.0199715,
"shortRate": 0.0117515,
"swapChargeTimestamp": 1707948000000,
"swapChargeInterval": 1440}},
"dealingRules": {
"minStepDistance": {
"unit": "POINTS",
"value": 0.001},
"minDealSize": {
"unit": "POINTS",
"value": 1},
"maxDealSize": {
"unit": "POINTS",
"value": 100000},
"minSizeIncrement": {
"unit": "POINTS",
"value": 0.1},
"minGuaranteedStopDistance": {
"unit": "PERCENTAGE",
"value": 1},
"minStopOrProfitDistance": {
"unit": "PERCENTAGE",
"value": 0.01},
"maxStopOrProfitDistance": {
"unit": "PERCENTAGE",
"value": 60},
"marketOrderPreference": "AVAILABLE_DEFAULT_ON",
"trailingStopsPreference": "NOT_AVAILABLE"},
"snapshot": {
"marketStatus": "TRADEABLE",
"netChange": -0.627,
"percentageChange": -0.27,
"updateTime": "2022-04-06T11:23:00.955",
"delayTime": 0,
"bid": 22.041,
"offer": 22.061,
"high": 22.098,
"low": 21.926,
"decimalPlacesFactor": 3,
"scalingFactor": 1,
"marketModes": [\
"REGULAR"]}}`

# [tag/Markets-Info-greater-Prices](https://open-api.capital.com/\#tag/Markets-Info-greater-Prices) Markets Info > Prices

## [tag/Markets-Info-greater-Prices/paths/~1api~1v1~1prices~1{epic}/get](https://open-api.capital.com/\#tag/Markets-Info-greater-Prices/paths/~1api~1v1~1prices~1{epic}/get) Historical prices

Returns historical prices for a particular instrument

All query parameters are optional for this request

By default returns the minute prices within the last 10 minutes

##### path Parameters

|     |     |
| --- | --- |
| epic<br>required | string<br>Example:{{epic}}<br>Instrument epic |

##### query Parameters

|     |     |
| --- | --- |
| resolution | string<br>Example:resolution=MINUTE<br>Defines the resolution of requested prices. Possible values are MINUTE, MINUTE\_5, MINUTE\_15, MINUTE\_30, HOUR, HOUR\_4, DAY, WEEK |
| max | integer<br>Example:max=10<br>The maximum number of the values in answer. Default = 10, max = 1000 |
| from | string<br>Example:from=2022-02-24T00:00:00<br>Start date. Date format: YYYY-MM-DDTHH:MM:SS (e.g. 2022-04-01T01:01:00). Filtration by date based on snapshotTimeUTC parameter |
| to | string<br>Example:to=2022-02-24T01:00:00<br>End date. Date format: YYYY-MM-DDTHH:MM:SS (e.g. 2022-04-01T01:01:00). Filtration by date based on snapshotTimeUTC parameter |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

**400**
Bad Request

get/api/v1/prices/{epic}

Base Live URL

https://api-capital.backend-capital.com/api/v1/prices/{epic}

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/prices/{epic}

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/prices/{{epic}}?resolution=MINUTE&max=10&from=2022-02-24T00:00:00&to=2022-02-24T01:00:00", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200
- 400

Content type

application/json

Example

Success: Default responseSuccess: Use not default resolution, start date and max parametersSuccess: Default response

Copy
Expand all  Collapse all

`{
"prices": [\
{\
"snapshotTime": "2022-04-06T15:18:00",\
"snapshotTimeUTC": "2022-04-06T13:18:00",\
"openPrice": {\
"bid": 24.356,\
"ask": 24.376},\
"closePrice": {\
"bid": 24.378,\
"ask": 24.398},\
"highPrice": {\
"bid": 24.378,\
"ask": 24.398},\
"lowPrice": {\
"bid": 24.355,\
"ask": 24.375},\
"lastTradedVolume": 187},\
{\
"snapshotTime": "2022-04-06T15:19:00",\
"snapshotTimeUTC": "2022-04-06T13:19:00",\
"openPrice": {\
"bid": 24.379,\
"ask": 24.399},\
"closePrice": {\
"bid": 24.379,\
"ask": 24.399},\
"highPrice": {\
"bid": 24.389,\
"ask": 24.409},\
"lowPrice": {\
"bid": 24.373,\
"ask": 24.393},\
"lastTradedVolume": 168},\
{\
"snapshotTime": "2022-04-06T15:20:00",\
"snapshotTimeUTC": "2022-04-06T13:20:00",\
"openPrice": {\
"bid": 24.378,\
"ask": 24.398},\
"closePrice": {\
"bid": 24.4,\
"ask": 24.42},\
"highPrice": {\
"bid": 24.4,\
"ask": 24.42},\
"lowPrice": {\
"bid": 24.375,\
"ask": 24.395},\
"lastTradedVolume": 183},\
{\
"snapshotTime": "2022-04-06T15:21:00",\
"snapshotTimeUTC": "2022-04-06T13:21:00",\
"openPrice": {\
"bid": 24.399,\
"ask": 24.419},\
"closePrice": {\
"bid": 24.395,\
"ask": 24.415},\
"highPrice": {\
"bid": 24.405,\
"ask": 24.425},\
"lowPrice": {\
"bid": 24.388,\
"ask": 24.408},\
"lastTradedVolume": 196},\
{\
"snapshotTime": "2022-04-06T15:22:00",\
"snapshotTimeUTC": "2022-04-06T13:22:00",\
"openPrice": {\
"bid": 24.394,\
"ask": 24.414},\
"closePrice": {\
"bid": 24.399,\
"ask": 24.419},\
"highPrice": {\
"bid": 24.4,\
"ask": 24.42},\
"lowPrice": {\
"bid": 24.383,\
"ask": 24.403},\
"lastTradedVolume": 171},\
{\
"snapshotTime": "2022-04-06T15:23:00",\
"snapshotTimeUTC": "2022-04-06T13:23:00",\
"openPrice": {\
"bid": 24.398,\
"ask": 24.418},\
"closePrice": {\
"bid": 24.381,\
"ask": 24.401},\
"highPrice": {\
"bid": 24.405,\
"ask": 24.425},\
"lowPrice": {\
"bid": 24.38,\
"ask": 24.4},\
"lastTradedVolume": 161},\
{\
"snapshotTime": "2022-04-06T15:24:00",\
"snapshotTimeUTC": "2022-04-06T13:24:00",\
"openPrice": {\
"bid": 24.38,\
"ask": 24.4},\
"closePrice": {\
"bid": 24.387,\
"ask": 24.407},\
"highPrice": {\
"bid": 24.399,\
"ask": 24.419},\
"lowPrice": {\
"bid": 24.38,\
"ask": 24.4},\
"lastTradedVolume": 155},\
{\
"snapshotTime": "2022-04-06T15:25:00",\
"snapshotTimeUTC": "2022-04-06T13:25:00",\
"openPrice": {\
"bid": 24.388,\
"ask": 24.408},\
"closePrice": {\
"bid": 24.389,\
"ask": 24.409},\
"highPrice": {\
"bid": 24.393,\
"ask": 24.413},\
"lowPrice": {\
"bid": 24.384,\
"ask": 24.404},\
"lastTradedVolume": 118},\
{\
"snapshotTime": "2022-04-06T15:26:00",\
"snapshotTimeUTC": "2022-04-06T13:26:00",\
"openPrice": {\
"bid": 24.389,\
"ask": 24.409},\
"closePrice": {\
"bid": 24.373,\
"ask": 24.393},\
"highPrice": {\
"bid": 24.39,\
"ask": 24.41},\
"lowPrice": {\
"bid": 24.37,\
"ask": 24.39},\
"lastTradedVolume": 143},\
{\
"snapshotTime": "2022-04-06T15:27:00",\
"snapshotTimeUTC": "2022-04-06T13:27:00",\
"openPrice": {\
"bid": 24.372,\
"ask": 24.392},\
"closePrice": {\
"bid": 24.375,\
"ask": 24.395},\
"highPrice": {\
"bid": 24.376,\
"ask": 24.396},\
"lowPrice": {\
"bid": 24.371,\
"ask": 24.391},\
"lastTradedVolume": 44}],
"instrumentType": "COMMODITIES"}`

# [tag/Markets-Info-greater-Client-Sentiment](https://open-api.capital.com/\#tag/Markets-Info-greater-Client-Sentiment) Markets Info > Client Sentiment

## [tag/Markets-Info-greater-Client-Sentiment/paths/~1api~1v1~1clientsentiment/get](https://open-api.capital.com/\#tag/Markets-Info-greater-Client-Sentiment/paths/~1api~1v1~1clientsentiment/get) Client sentiment for markets

Returns the client sentiment for the given market

##### query Parameters

|     |     |
| --- | --- |
| marketIds | string<br>Example:marketIds=SILVER,NATURALGAS<br>Comma separated list of market identifiers |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

**404**
Not Found

get/api/v1/clientsentiment

Base Live URL

https://api-capital.backend-capital.com/api/v1/clientsentiment

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/clientsentiment

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/clientsentiment?marketIds=SILVER,NATURALGAS", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200
- 404

Content type

application/json

Copy
Expand all  Collapse all

`{
"clientSentiments": [\
{\
"marketId": "SILVER",\
"longPositionPercentage": 91.85,\
"shortPositionPercentage": 8.15},\
{\
"marketId": "NATURALGAS",\
"longPositionPercentage": 62.97,\
"shortPositionPercentage": 37.03}]}`

## [tag/Markets-Info-greater-Client-Sentiment/paths/~1api~1v1~1clientsentiment~1{marketId}/get](https://open-api.capital.com/\#tag/Markets-Info-greater-Client-Sentiment/paths/~1api~1v1~1clientsentiment~1{marketId}/get) Client sentiment for market

Returns the client sentiment for the given market

##### path Parameters

|     |     |
| --- | --- |
| marketId<br>required | string<br>Example:{{marketId}}<br>Market identifier |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

**404**
Not Found

get/api/v1/clientsentiment/{marketId}

Base Live URL

https://api-capital.backend-capital.com/api/v1/clientsentiment/{marketId}

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/clientsentiment/{marketId}

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/clientsentiment/{{marketId}}", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200
- 404

Content type

application/json

Copy

`{
"marketId": "SILVER",
"longPositionPercentage": 91.85,
"shortPositionPercentage": 8.15}`

# [tag/Watchlists](https://open-api.capital.com/\#tag/Watchlists) Watchlists

## [tag/Watchlists/paths/~1api~1v1~1watchlists/get](https://open-api.capital.com/\#tag/Watchlists/paths/~1api~1v1~1watchlists/get) All watchlists

Returns all watchlists belonging to the current user

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

get/api/v1/watchlists

Base Live URL

https://api-capital.backend-capital.com/api/v1/watchlists

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/watchlists

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/watchlists", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200

Content type

application/json

Copy
Expand all  Collapse all

`{
"watchlists": [\
{\
"id": "123456",\
"name": "Hello world",\
"editable": true,\
"deleteable": true,\
"defaultSystemWatchlist": false},\
{\
"id": "123457",\
"name": "watchlist1",\
"editable": true,\
"deleteable": true,\
"defaultSystemWatchlist": false}]}`

## [tag/Watchlists/paths/~1api~1v1~1watchlists/post](https://open-api.capital.com/\#tag/Watchlists/paths/~1api~1v1~1watchlists/post) Create watchlist

Create a watchlist

List of request body parameters:

| **Parameter** | **Format** | **Required?** | **Description** |
| --- | --- | --- | --- |
| name | string | YES | Watchlist name <br>Min length = 1 <br>Max length = 20 |
| epics | array\[string\] | NO | List of market epics to be associated with this new watchlist |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

##### Request Body schema: application/json

object

### Responses

**200**
OK

**400**
Bad Request

post/api/v1/watchlists

Base Live URL

https://api-capital.backend-capital.com/api/v1/watchlists

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/watchlists

### Request samples

- Payload
- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Content type

application/json

Copy
Expand all  Collapse all

`{
"epics": [\
"SILVER",\
"NATURALGAS"],
"name": "Lorem"}`

### Response samples

- 200
- 400

Content type

application/json

Example

Success: Watchlist createdSuccess: Not all instruments addedSuccess: Watchlist created

Copy

`{
"watchlistId": "123458",
"status": "SUCCESS"}`

## [tag/Watchlists/paths/~1api~1v1~1watchlists~1{watchlistId}/get](https://open-api.capital.com/\#tag/Watchlists/paths/~1api~1v1~1watchlists~1{watchlistId}/get) Single watchlist

Returns a watchlist for the given watchlist identifier

##### path Parameters

|     |     |
| --- | --- |
| watchlistId<br>required | string<br>Example:{{watchlistId}}<br>Identifier of the watchlist |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

**404**
Not Found

get/api/v1/watchlists/{watchlistId}

Base Live URL

https://api-capital.backend-capital.com/api/v1/watchlists/{watchlistId}

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/watchlists/{watchlistId}

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/watchlists/{{watchlistId}}", Method.Get);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200
- 404

Content type

application/json

Copy
Expand all  Collapse all

`{
"markets": [\
{\
"instrumentName": "Silver",\
"expiry": "-",\
"epic": "SILVER",\
"symbol": "Silver",\
"instrumentType": "COMMODITIES",\
"marketStatus": "TRADEABLE",\
"lotSize": 1,\
"high": 22.098,\
"low": 21.926,\
"percentageChange": -0.27,\
"netChange": -0.627,\
"bid": 22.041,\
"offer": 22.061,\
"updateTime": "2022-04-06T11:24:09.756",\
"updateTimeUTC": "2022-04-06T11:24:09.756",\
"delayTime": 0,\
"streamingPricesAvailable": true,\
"scalingFactor": 1,\
"marketModes": [\
"REGULAR"],\
"pipPosition": 2,\
"tickSize": 0.001},\
{\
"instrumentName": "Natural Gas",\
"expiry": "-",\
"epic": "NATURALGAS",\
"symbol": "Natural Gas",\
"instrumentType": "COMMODITIES",\
"marketStatus": "TRADEABLE",\
"lotSize": 1,\
"high": 1.719,\
"low": 1.693,\
"percentageChange": 0.12,\
"netChange": -0.077,\
"bid": 1.701,\
"offer": 1.706,\
"updateTime": "2022-04-06T11:24:10.889",\
"updateTimeUTC": "2022-04-06T11:24:10.889",\
"delayTime": 0,\
"streamingPricesAvailable": true,\
"scalingFactor": 1,\
"marketModes": [\
"REGULAR"],\
"pipPosition": 3,\
"tickSize": 0.0001}]}`

## [tag/Watchlists/paths/~1api~1v1~1watchlists~1{watchlistId}/put](https://open-api.capital.com/\#tag/Watchlists/paths/~1api~1v1~1watchlists~1{watchlistId}/put) Add market to watchlist

Add a market to the watchlist

List of request body parameters:

| **Parameter** | **Format** | **Required?** | **Description** |
| --- | --- | --- | --- |
| epic | string | YES | Instrument epic identifier |

##### path Parameters

|     |     |
| --- | --- |
| watchlistId<br>required | string<br>Example:{{watchlistId}}<br>Identifier of the watchlist |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

##### Request Body schema: application/json

object

### Responses

**200**
OK

**404**
Not Found

put/api/v1/watchlists/{watchlistId}

Base Live URL

https://api-capital.backend-capital.com/api/v1/watchlists/{watchlistId}

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/watchlists/{watchlistId}

### Request samples

- Payload
- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Content type

application/json

Copy

`{
"epic": "SILVER"}`

### Response samples

- 200
- 404

Content type

application/json

Copy

`{
"status": "SUCCESS"}`

## [tag/Watchlists/paths/~1api~1v1~1watchlists~1{watchlistId}/delete](https://open-api.capital.com/\#tag/Watchlists/paths/~1api~1v1~1watchlists~1{watchlistId}/delete) Delete watchlist

Delete the watchlist

##### path Parameters

|     |     |
| --- | --- |
| watchlistId<br>required | string<br>Example:{{watchlistId}}<br>Identifier of the watchlist |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

**404**
Not Found

delete/api/v1/watchlists/{watchlistId}

Base Live URL

https://api-capital.backend-capital.com/api/v1/watchlists/{watchlistId}

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/watchlists/{watchlistId}

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/watchlists/{{watchlistId}}", Method.Delete);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200
- 404

Content type

application/json

Copy

`{
"status": "SUCCESS"}`

## [tag/Watchlists/paths/~1api~1v1~1watchlists~1{watchlistId}~1{epic}/delete](https://open-api.capital.com/\#tag/Watchlists/paths/~1api~1v1~1watchlists~1{watchlistId}~1{epic}/delete) Remove market from watchlist

Remove a market from the watchlist

##### path Parameters

|     |     |
| --- | --- |
| watchlistId<br>required | string<br>Example:{{watchlistId}}<br>Identifier of the watchlist |
| epic<br>required | string<br>Example:{{epic}}<br>Instrument epic identifier |

##### header Parameters

|     |     |
| --- | --- |
| X-SECURITY-TOKEN | string<br>Example:ENTER\_OBTAINED\_SECURITY\_TOKEN<br>Account token identifying the client's current account |
| CST | string<br>Example:ENTER\_OBTAINED\_CST\_TOKEN<br>Access token identifying the client |

### Responses

**200**
OK

**404**
Not Found

delete/api/v1/watchlists/{watchlistId}/{epic}

Base Live URL

https://api-capital.backend-capital.com/api/v1/watchlists/{watchlistId}/{epic}

Base Demo URL

https://demo-api-capital.backend-capital.com/api/v1/watchlists/{watchlistId}/{epic}

### Request samples

- C#
- cURL
- HTTP
- Java
- JavaScript
- NodeJS
- PHP
- Python

Copy

```
var options = new RestClientOptions("https://api-capital.backend-capital.com")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("/api/v1/watchlists/{{watchlistId}}/{{epic}}", Method.Delete);
request.AddHeader("X-SECURITY-TOKEN", "ENTER_OBTAINED_SECURITY_TOKEN");
request.AddHeader("CST", "ENTER_OBTAINED_CST_TOKEN");
RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);
```

### Response samples

- 200
- 404

Content type

application/json

Copy

`{
"status": "SUCCESS"}`