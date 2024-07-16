# Methodfi-Dunkin Project

This project consists of a client-side application built with React and TypeScript, and a server-side application built with Node.js, Express, and TypeScript. The backend uses MongoDB. The solution aims to provide a comprehensive solution for Dunkin's employees' student loan repayment use case.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Client Side Application](#client-side-application)
    - [Getting Started](#getting-started-client)
3. [Server Side Application](#server-side-application)
    - [Getting Started](#getting-started-server)
4. [Steps for End Users](#steps-for-end-users)

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js**: [Download and install Node.js](https://nodejs.org/)
- **npm**: Comes with Node.js, but you can also update it via `npm install -g npm`
- **MongoDB**: [Download and install MongoDB](https://www.mongodb.com/try/download/community)
- **TypeScript**: Install globally via `npm install -g typescript`

To verify the installation of each prerequisite, you can use the following commands:

```sh
node -v
npm -v
tsc -v
mongo --version
```

## Client Side Application

### Getting Started {#getting-started-client}

To get the client application running locally:

1. Clone this repository: `https://github.com/sharadson/methodfi-dunkin.git`
2. Navigate to the `client/dashboard/` directory.
3. Install dependencies with `npm install`.
4. Start the development server with `npm start`.

## Server Side Application

### Getting Started {#getting-started-server}

To get the server application running locally:

1. Navigate to the `server` directory.
2. Install dependencies with `npm install`.
3. Build the project with `npm run build`.
4. Start the server with `npm start`.

## Steps for End Users

After both the client and server are running, follow these steps to repay student loans:

1. Open the client application in your browser.
2. Click on the "Upload" tab at the top of the page.
3. Upload an XML file containing the student loan data.
4. Click on the "Payment" tab at the top.
5. Select the file you uploaded from the dropdown to see the list of loans.
6. Click "Approve" to approve the payments after reviewing them.
7. Click "Process" or "Discard" to manage the batch after reviewing the payments.
8. After processing, go to the "Reports" tab to see reports related to the processed payment batch. 
9. Switch between the tabs to see different reports
   - TOTAL AMOUNT PER SOURCE
   - TOTAL AMOUNT PER BRANCH
   - PAYMENT STATUS
