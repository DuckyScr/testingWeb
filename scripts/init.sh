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
npx prisma db push --force-reset

echo "Creating admin user..."
npm run create-user

echo "Starting the application..."
npm start