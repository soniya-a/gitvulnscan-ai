#!/usr/bin/env bash

set -e

pip install -r requirements.txt

wget https://github.com/dependency-check/DependencyCheck/releases/download/v12.2.2/dependency-check-12.2.2-release.zip

unzip dependency-check-12.2.2-release.zip

chmod +x dependency-check/bin/dependency-check.sh