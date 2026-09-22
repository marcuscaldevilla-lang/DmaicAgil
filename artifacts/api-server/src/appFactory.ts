import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import type { IRouter } from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { logger } from "./lib/logger";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export function createApp(apiRouter: IRouter): Express {
  const app: Express = express();

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );
  app.use(cors());
  app.use(express.json({ limit: "4mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use("/api", apiRouter);

  // Serve the built frontend (dmaic-agil-suite) from the same origin so the
  // whole application is reachable through a single public URL, with no CORS
  // or client-side base URL configuration required.
  const frontendDist = path.resolve(
    currentDirectory,
    "../../dmaic-agil-suite/dist/public",
  );

  if (fs.existsSync(path.join(frontendDist, "index.html"))) {
    app.use(express.static(frontendDist));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  }

  return app;
}