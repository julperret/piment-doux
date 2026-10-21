import { config } from "dotenv";

config({
    path: ".env.test",
    quiet: true,
});

const databaseUrl: string | undefined = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set: check that .env.test exists and defines it");
}

const parsedUrl: URL = new URL(databaseUrl);
const databaseName: string = parsedUrl.pathname.slice(1);
const isTestDatabase: boolean = databaseName.endsWith("_test");

if (!isTestDatabase) {
    throw new Error(
        `Refusing to run tests against database "${databaseName}": the database name must end with "_test"`,
    );
}
