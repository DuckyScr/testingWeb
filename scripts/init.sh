#!/bin/bash

wait_for_db() {
    echo "Waiting for database to be ready..."
    while ! nc -z db 5432; do
        sleep 1
    done
    sleep 5
}

wait_for_db

echo "Running database migrations..."
npx prisma db push --accept-data-loss

echo "Creating admin user..."
npm run create-user

echo "Initializing client visibility permissions..."
node src/scripts/init-client-visibility-permissions.js

echo "Initializing drone sales permissions..."
node src/scripts/init-drone-sales-permissions.js

echo "Starting the application..."
npm start
