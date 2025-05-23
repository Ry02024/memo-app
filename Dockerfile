# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install project dependencies
# Ensure this is `npm ci` for production builds if package-lock.json is present and reliable
RUN npm install

# Bundle app's source
COPY . .

# Make port 8080 available to the world outside this container
EXPOSE 8080

# Define environment variables
# PORT is already defined by Cloud Run, but good for local consistency
ENV PORT 8080 
# These will be populated by Cloud Run from Secret Manager or configuration
ENV GOOGLE_CLIENT_ID="dummy_client_id"
ENV GOOGLE_CLIENT_SECRET="dummy_client_secret"
ENV SESSION_SECRET="dummy_session_secret"

# Run index.js when the container launches
CMD ["node", "index.js"]
