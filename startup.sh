#!/bin/bash

# Start PHP-FPM in the background
php-fpm -D
status=$?
if [ $status -ne 0 ]; then
  echo "Failed to start php-fpm: $status"
  exit $status
fi

# Start Nginx in the foreground
nginx -g "daemon off;"
status=$?
if [ $status -ne 0 ]; then
  echo "Failed to start nginx: $status"
  exit $status
fi

# Naive check runs checks once a minute to see if either of the processes exited.
while sleep 60; do
  ps aux | grep php-fpm | grep -q -v grep
  PROCESS_1_STATUS=$?
  ps aux |grep nginx |grep -q -v grep
  PROCESS_2_STATUS=$?
  
  if [ $PROCESS_1_STATUS -ne 0 ]; then
    echo "PHP-FPM process has already exited."
    exit 1
  fi
  
  if [ $PROCESS_2_STATUS -ne 0 ]; then
    echo "Nginx process has already exited."
    exit 1
  fi
done
