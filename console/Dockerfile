# ---- Build Stage ----
FROM node:18.15.0-alpine AS builder

# Set the working directory in the container to /app
WORKDIR /app

# Create the pnpm directory and set the PNPM_HOME environment variable
RUN mkdir -p ~/.pnpm
ENV PNPM_HOME /root/.pnpm

# Set environment
ARG ENVIRONMENT=production

# Add the pnpm global bin to the PATH
ENV PATH /root/.pnpm/bin:$PATH

# Copy pnpm-lock.yaml (or package.json) into the directory /app in the container
COPY console/package.json console/pnpm-lock.yaml ./

# Copy over .npmrc if applicable
COPY console/.npmr[c] ./

# Install global dependencies
RUN npm install -g ember-cli pnpm 

# Install git
RUN apk update && apk add git openssh-client

# Trust GitHub's RSA host key
RUN mkdir -p -m 0600 ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts

# Install app dependencies
RUN pnpm install

# Copy the console directory contents into the container at /app
COPY console .

# Build the application
RUN pnpm build --environment $ENVIRONMENT

# ---- Serve Stage ----
FROM nginx:alpine

# Copy the built app to our served directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose the port nginx is bound to
EXPOSE 4200

# Use custom nginx.conf
COPY console/nginx.conf /etc/nginx/conf.d/default.conf

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]