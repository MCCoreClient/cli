# MCCoreClient CLI

This project makes it easier for users to create and upload packages to MCCoreClient.

## Installation

Install the CLI globally using npm:
```bash
npm install -g mccoreclient-cli
```

## Primary Usage

When you have a package you want to upload, run the following commands:
```bash
mccoreclient login <access-token>
mccoreclient package upload

# Example:
# Note: You can create an access token by going to app.mccoreclient.com
mccoreclient login eyJhs...
mccoreclient package upload
```
This will authenticate your terminal (until revoked) then deploy the package to the server. You should then be able to see the package on your [dashboard](app.mccoreclient.com).