import express from "express";
import { v4 } from "uuid";
import chalk from "chalk";
import path from "path";
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3013;
const app = express();

function log(message) {
    console.log(chalk.magenta("modules/dataservice ") + chalk.green("INFO: ") + message);
}

function logWarning(message) {
    console.log(chalk.magenta("modules/dataservice ") + chalk.yellow("WARNING: ") + message);
}

function logError(message) {
    console.error(chalk.magenta("modules/dataservice ") + chalk.red("ERROR: ") + message);
}

export function run() {
    app.use(express.json());

    app.post('/bluefinservice/device/activate', (req, res) => {
        res.status(200).json({
            Success: true,
            Errors: [],
            StatusCode: 200
        });
    })

    app.post('/bluefinservice/device/deactivate', (req, res) => {
        res.status(200).json({
            Success: true,
            Errors: [],
            StatusCode: 200
        });
    })

    app.all("*", (req, res) => {
        log("new " + req.method + " request to " + req.originalUrl);

        // handle root path or invalid urls
        if (req.originalUrl === "" || req.originalUrl === "/") {
            res.status(404).json({
                MessageId: v4(),
                Errors: ['Endpoint does not exist'],
                Success: false,
            }).end();
            return;
        }

        // resolve the endpoint path
        const endpointPath = path.join(__dirname, req.originalUrl);

        // check if the directory exists
        if (!fs.existsSync(endpointPath)) {
            res.status(404).json({
                MessageId: v4(),
                Errors: ['Endpoint does not exist'],
                Success: false,
            }).end();
            return;
        }

        // convert the endpoint path to a valid file URL
        const moduleURL = pathToFileURL(path.join(endpointPath, 'script.js')).href;

        // add a timestamp to force reloading
        const timestampedURL = `${moduleURL}?v=${Date.now()}`;

        // import the dynamically matched script.js for the route
        import(timestampedURL).then((ApiModule) => {
            if (ApiModule.method !== req.method) {
                res.status(405).json({
                    MessageId: v4(),
                    Errors: ['Endpoint does not support method ' + req.method],
                    Success: false,
                }).end();
                return;
            }

            try {
                ApiModule.execute(req, res);
            } catch (err) {
                res.status(500).json({
                    MessageId: v4(),
                    Errors: ['Internal error occurred: ' + err.message],
                    Success: false,
                }).end();
            }
        }).catch((err) => {
            res.status(500).json({
                MessageId: v4(),
                Errors: ['Failed to load endpoint: ' + err.message],
                Success: false,
            }).end();
        });
    });

    app.listen(PORT, () => {
        log(`Server is listening on port ${PORT}!`);
    });
}