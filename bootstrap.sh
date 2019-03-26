#!/bin/bash

# Get latest definitions
freshclam

# Reload Services
service clamav-daemon force-reload 
service clamav-freshclam force-reload

# Run node process
npm start