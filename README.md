# AIS UDP

A demon service to dispatch a AIVDM/AIVDO Protocol data stream into MongoDB. 
Details about this project can be found [here](https://blog.3epnm.de/2020/05/15/AIS-Services/).

## Installation
The installation is done by cloning the project and installing the dependencies.
```
git clone https://github.com/3epnm/ais-udp
cd ais-udp
npm install
```
Before the project can be started, the configuration must first be adjusted.

## Configuration
The configuration is carried out with [node-config-ts](https://www.npmjs.com/package/node-config-ts). A simple but effective configuration manager for typescript based projects. The easiest way to adapt the configuration is to adapt the file default.json from the config directory of the project folder. In practice, it has proven useful to use a new configuration file depending on the NODE_ENV variable. How this works is explained in the documentation of node-config-ts. Refer to the npm page [node-config-ts](https://www.npmjs.com/package/node-config-ts) to learn all features it offers. 

The configuration file has the following content, which is explained below.
```javascript
{
    "database": {
        "url": "mongodb://127.0.0.1:27017",
        "options": {
            "useNewUrlParser": true,
            "useUnifiedTopology": true
        },
        "dbName": "ais_tracker",
        "sender": "***"
    },
    "dispatcher": {
        "udpPort": 10110
    },
    "logger": {
        "level": "info",
        "filter": 0,
        "filename": ""
    },
    "ssh": {
        "enabled": false,
        "forward": "27017:127.0.0.1:27017",
        "host": "***"
    }
}
```
### Database section
The configuration of the database is as follows:

|Parameter|Description|
|--|--|
|url|The connection url to the MongoDB instance.|
|options<br><br>|Options to setup the Database Connection.<br>All options of the [native MongoDB Driver](https://mongodb.github.io/node-mongodb-native/3.5/api/) are possible.|
|dbName|The name of the database where to store report data.|
|sender<br><br>|The name of the sender. Makes it possible to distinguish between<br>those who have created or updated a report in the case of several transmitters.|

AIS Tools initializes the database with the necessary collections and more important creates the necessary indexes. Default documents and position documents expire after one day and position documents are set with a geospatial index. Shipdata documents do not expire and will be updated if a new report is received.

### Dispatcher section
The only configuration option is the the port number of the UDP stream with AIVDM/AIVDO Protocol Reports.
 
### Logger section
Logging is done with Winston universal logging library. 

|Parameter|Description|
|--|--|
|level<br><br>|The logging levels are named after npm logging levels and allows<br>to configure how verbose the messages are written to a logfile or to stdout.|
|filter<br><br><br>|The filter is a MMSI Number - an identifier every AIS Report has<br>and which is unique to the vessel.<br>Used to log the processing of Reports for a specific vessel.|
|filename<br><br>|The filename where the log file is written to.<br>If empty, the messages are written to stdout.|

The logger uses the winston-daily-rotate-file to archive log files if used in a debug level for a longer period of time. In addition, the logger can also be controlled via the NODE_ENV environment variable. If set to "debug", the log messages also written to stdout, regardless of whether the filename parameter is set or not.

### SSH section
The following configuration enables an SSH tunnel to be created if required, which is started as a child process.

|Parameter|Description|
|--|--|
|enabled|Whether the function is used or not|
|forward|Which port from the source is forwarded to a port at the destination|
|host|The host of the source|

## Start the Service
Once the configuration is done, the service can be started with `npm start` 

