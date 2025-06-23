Feature Specification: AI-Integrated Trading Bot System
Overview
This system allows users to register trading bots that operate based on defined strategies and broker credentials. Bots can be scheduled to run based on specific timeframes, with optional autonomous trading (AI-assisted decision-making via a multimodal LLM like Gemini). Each bot evaluation is processed using Python-generated chart images interpreted by an AI model, which returns structured trading actions.

Entities & Functionalities
1. Broker Credentials
Users can register broker credentials that will be used to execute trades through integrated broker APIs.

Fields:

id

userId

capitalApiKey

capitalIdentifier

capitalPassword

createdAt

2. Strategies
Users define trading strategies with a descriptive explanation, a list of indicators with configurable parameters, and risk controls.

Fields:

id

userId

name

description (textual explanation of the strategy)

indicators[] (array of indicator definitions and parameters)

riskMin (float, e.g., 0.5)

riskMax (float, e.g., 4.0)

createdAt

3. Bots
Bots represent executable agents that operate based on strategies and broker credentials. Each bot is scheduled to run at regular intervals (based on its selected timeframe) and can operate in either manual or AI-driven autonomous mode.

Fields:

id

userId

strategyId (FK)

brokerCredentialId (FK)

timeframe (e.g., '1m', '5m', '1h')

maxSimultaneousTrades (integer)

isActive (boolean): Whether the bot is currently running.

isAiTradingActive (boolean): Whether AI-based autonomous trading is enabled.

createdAt

Bot Behavior:

Runs on a scheduler according to its timeframe.

Before execution, checks for open positions for the trading pair.

Passes current open trade data and chart image to the AI model.

Receives structured JSON response from the AI model with decisions like:

Open/Close trade

Adjust stop-loss/take-profit

Partial close

Any risk management instruction

4. Evaluations
Each bot execution triggers an Evaluation, representing the AI's analysis of the current market condition.

Fields:

id

botId (FK)

executedAt (timestamp)

chartImagePath (reference to image file)

aiResponseJson (structured JSON returned by Gemini model)

positionSnapshot (details of open position at time of evaluation)

actionTaken (optional, summary of what action was taken based on the AI response)


[User]
   |
   | 1
   |——< [BrokerCredential]
   |
   |——< [Strategy]
   |
   |——< [Bot] ——< [Evaluation]
           |         |
           |         |—— chartImagePath
           |         |—— aiResponseJson
           |         |—— positionSnapshot
           |
           |—— strategyId (FK to Strategy)
           |—— brokerCredentialId (FK to BrokerCredential)